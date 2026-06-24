import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"

export type SalesSyncSummary = {
  considered: number
  synced: number
  skipped: number
  errors: number
}

const POS_CUSTOMER = "POS Walk-in Customer"
const FALLBACK_ITEM = "POS Sale"

// Find (or lazily create) the generic Service item used for sale lines whose SKU
// doesn't map to a QuickBooks item.
async function getFallbackItemId(
  qbo: QuickbooksModuleService
): Promise<string> {
  const existing = (await qbo.query(
    `select * from Item where Name = '${FALLBACK_ITEM}'`
  ))?.QueryResponse?.Item?.[0]
  if (existing) return String(existing.Id)

  const income = (await qbo.query(
    "select * from Account where AccountType = 'Income' maxresults 1"
  ))?.QueryResponse?.Account?.[0]
  if (!income) throw new Error("No income account found in QuickBooks")

  const created = await qbo.createEntity("item", {
    Name: FALLBACK_ITEM,
    Type: "Service",
    IncomeAccountRef: { value: income.Id },
  })
  return String(created?.Item?.Id)
}

// Pushes recent Medusa orders to QuickBooks as SalesReceipts. Idempotent: an
// order already logged as "synced" is skipped, so re-runs never double-post.
//
// Tax note: the US sandbox has no HST, so we post line subtotals with
// GlobalTaxCalculation=NotApplicable. Wiring Ontario HST tax codes is a
// production step against the real Canadian company.
export async function syncSales(
  container: MedusaContainer,
  opts: { limit?: number } = {}
): Promise<SalesSyncSummary> {
  const qbo = container.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const limit = opts.limit ?? 100

  // Skip orders we've already pushed.
  const synced = await qbo.listSalesSyncLogs(
    { status: "synced" },
    { take: 100000, select: ["order_id"] }
  )
  const syncedIds = new Set((synced as any[]).map((s) => s.order_id))

  // SKU -> QuickBooks item id, plus a fallback for unmapped SKUs.
  const items = await qbo.fetchItems()
  const skuToItem = new Map<string, string>()
  for (const it of items) {
    if (it.Sku) skuToItem.set(String(it.Sku), String(it.Id))
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "currency_code",
      "total",
      "items.title",
      // quantity only resolves when the detail relation is also requested
      "items.quantity",
      "items.detail.quantity",
      "items.unit_price",
      "items.variant_sku",
      "items.variant_id",
    ],
    pagination: { take: limit, order: { created_at: "DESC" } },
  })

  // POS-created orders don't snapshot variant_sku, so resolve SKUs from the
  // variant ids referenced across all the orders in one query.
  const variantIds = [
    ...new Set(
      (orders as any[])
        .flatMap((o) => o.items ?? [])
        .map((li: any) => li.variant_id)
        .filter(Boolean)
    ),
  ] as string[]
  const variantIdToSku = new Map<string, string>()
  if (variantIds.length) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "barcode"],
      filters: { id: variantIds },
    })
    for (const v of variants as any[]) {
      const key = v.sku || v.barcode
      if (key) variantIdToSku.set(v.id, String(key))
    }
  }

  let syncedCount = 0
  let skipped = 0
  let errors = 0
  let customerId: string | null = null
  let fallbackId: string | null = null

  for (const order of orders as any[]) {
    if (syncedIds.has(order.id)) {
      skipped++
      continue
    }
    const lineItems = (order.items ?? [])
      .map((li: any) => ({
        ...li,
        _qty: Number(li.quantity ?? li.detail?.quantity ?? 0),
        _sku: li.variant_sku || variantIdToSku.get(li.variant_id) || null,
      }))
      .filter((li: any) => li._qty > 0)
    if (!lineItems.length) {
      skipped++
      continue
    }

    try {
      // Lazily resolve the customer + fallback item once we know there's work.
      if (!customerId) {
        const customer = await qbo.findOrCreateCustomer(POS_CUSTOMER)
        customerId = String(customer.Id)
      }
      if (!fallbackId) {
        fallbackId = await getFallbackItemId(qbo)
      }

      const body = {
        CustomerRef: { value: customerId },
        GlobalTaxCalculation: "NotApplicable",
        PrivateNote: `Medusa order #${order.display_id ?? order.id}`,
        Line: lineItems.map((li: any) => {
          const qty = li._qty
          const price = Number(li.unit_price) || 0
          const itemId =
            (li._sku && skuToItem.get(String(li._sku))) || fallbackId
          return {
            DetailType: "SalesItemLineDetail",
            Amount: qty * price,
            Description: li.title ?? undefined,
            SalesItemLineDetail: {
              ItemRef: { value: itemId },
              Qty: qty,
              UnitPrice: price,
            },
          }
        }),
      }

      const resp = await qbo.createEntity("salesreceipt", body)
      const docId = resp?.SalesReceipt?.Id

      await upsertLog(qbo, order.id, {
        qbo_doc_id: docId ? String(docId) : null,
        status: "synced",
        error: null,
        total: Number(order.total) || 0,
        synced_at: new Date(),
      })
      syncedCount++
    } catch (e) {
      await upsertLog(qbo, order.id, {
        status: "error",
        error: (e as Error).message,
        total: Number(order.total) || 0,
      })
      errors++
    }
  }

  return {
    considered: (orders as any[]).length,
    synced: syncedCount,
    skipped,
    errors,
  }
}

async function upsertLog(
  qbo: QuickbooksModuleService,
  order_id: string,
  data: Record<string, unknown>
): Promise<void> {
  const [existing] = await qbo.listSalesSyncLogs({ order_id }, { take: 1 })
  if (existing) {
    await qbo.updateSalesSyncLogs({ id: (existing as any).id, ...data })
  } else {
    await qbo.createSalesSyncLogs({ order_id, ...data })
  }
}
