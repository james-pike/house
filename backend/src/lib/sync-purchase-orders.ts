import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"

export type PoSyncSummary = {
  purchase_orders: number
  lines: number
  matched: number
  unmatched: number
}

// Pulls every PurchaseOrder from the connected QuickBooks company, matches each
// line to a Medusa variant by SKU/UPC, and mirrors them into the local
// qbo_purchase_order tables. Re-runnable: existing lines are updated in place so
// qty_received (written by the POS receive flow) is preserved across syncs.
export async function syncPurchaseOrders(
  container: MedusaContainer
): Promise<PoSyncSummary> {
  const qbo = container.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // 1. Build QuickBooks Item id -> Sku map. PO lines reference an Item by id;
  //    the Item's Sku is what we match against Medusa variants.
  const items = await qbo.fetchItems()
  const itemSku = new Map<string, string | null>()
  for (const it of items) {
    itemSku.set(String(it.Id), it.Sku ?? null)
  }

  const pos = await qbo.fetchPurchaseOrders()

  let lineCount = 0
  let matched = 0
  let unmatched = 0

  for (const po of pos) {
    const header = {
      qbo_id: String(po.Id),
      doc_number: po.DocNumber ?? null,
      vendor_name: po.VendorRef?.name ?? null,
      vendor_ref: po.VendorRef?.value ?? null,
      status: po.POStatus === "Closed" ? ("closed" as const) : ("open" as const),
      txn_date: po.TxnDate ? new Date(po.TxnDate) : null,
      total: Number(po.TotalAmt ?? 0),
      synced_at: new Date(),
    }

    // Only item lines are receivable; skip account-based expense lines.
    const qboLines = (po.Line ?? [])
      .filter((l: any) => l.DetailType === "ItemBasedExpenseLineDetail")
      .map((l: any) => {
        const d = l.ItemBasedExpenseLineDetail ?? {}
        const itemRef = d.ItemRef?.value ? String(d.ItemRef.value) : null
        const sku = itemRef ? itemSku.get(itemRef) ?? null : null
        return {
          qbo_line_id: l.Id ? String(l.Id) : null,
          item_ref: itemRef,
          item_name: d.ItemRef?.name ?? null,
          sku,
          description: l.Description ?? null,
          qty_ordered: Number(d.Qty ?? 0),
          unit_cost: Number(d.UnitPrice ?? 0),
          amount: Number(l.Amount ?? 0),
        }
      })

    // Resolve all SKUs on this PO to Medusa variant ids in one query.
    const skus = [...new Set(qboLines.map((l) => l.sku).filter(Boolean))] as string[]
    const variantBySku = new Map<string, string>()
    if (skus.length) {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "sku", "barcode"],
        filters: { $or: [{ sku: skus }, { barcode: skus }] },
      })
      for (const v of variants as any[]) {
        if (v.sku) variantBySku.set(v.sku, v.id)
        if (v.barcode) variantBySku.set(v.barcode, v.id)
      }
    }

    // Upsert the PO header.
    const [existing] = await qbo.listPurchaseOrders(
      { qbo_id: header.qbo_id },
      { take: 1, relations: ["lines"] }
    )
    let poId: string
    if (existing) {
      await qbo.updatePurchaseOrders({ id: existing.id, ...header })
      poId = existing.id
    } else {
      const created = await qbo.createPurchaseOrders(header)
      poId = (created as any).id
    }

    // Upsert lines, keyed by QuickBooks line id, preserving qty_received.
    const existingLines: any[] = existing?.lines ?? []
    const byLineId = new Map(
      existingLines.map((l) => [l.qbo_line_id, l] as const)
    )
    for (const ql of qboLines) {
      lineCount++
      const variant_id = ql.sku ? variantBySku.get(ql.sku) ?? null : null
      if (variant_id) matched++
      else unmatched++

      const prev = ql.qbo_line_id ? byLineId.get(ql.qbo_line_id) : undefined
      if (prev) {
        await qbo.updatePurchaseOrderLines({
          id: prev.id,
          item_ref: ql.item_ref,
          item_name: ql.item_name,
          sku: ql.sku,
          description: ql.description,
          qty_ordered: ql.qty_ordered,
          unit_cost: ql.unit_cost,
          amount: ql.amount,
          variant_id,
        })
      } else {
        await qbo.createPurchaseOrderLines({
          ...ql,
          variant_id,
          qty_received: 0,
          purchase_order_id: poId,
        })
      }
    }

    // Reconcile deletions: drop local lines (and their receipts) that no longer
    // exist on the QuickBooks PO — e.g. a line removed in QuickBooks.
    const liveLineIds = new Set(qboLines.map((l) => l.qbo_line_id))
    for (const ex of existingLines) {
      if (!liveLineIds.has(ex.qbo_line_id)) {
        const recs = await qbo.listPurchaseOrderReceipts(
          { line_id: ex.id },
          { select: ["id"] }
        )
        if (recs.length) await qbo.deletePurchaseOrderReceipts(recs.map((r: any) => r.id))
        await qbo.deletePurchaseOrderLines(ex.id)
      }
    }
  }

  return {
    purchase_orders: pos.length,
    lines: lineCount,
    matched,
    unmatched,
  }
}
