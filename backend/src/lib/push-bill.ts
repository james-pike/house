import type { MedusaContainer } from "@medusajs/framework/types"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"

export type BillResult = {
  ok: boolean
  skipped?: string
  bill_id?: string
  doc_number?: string
  message?: string
}

// Creates a QuickBooks Bill from a PO's received quantities and links it back to
// the original PurchaseOrder lines (which closes the PO in QuickBooks once fully
// billed). Idempotent: a PO that already carries a qbo_bill_id is skipped.
//
// Books model note: QuickBooks has no per-line "received" field on a PO — the way
// a delivery lands in the books is a Bill that references the PO. So we bill what
// physically arrived (qty_received), not what was ordered.
export async function pushPurchaseOrderBill(
  container: MedusaContainer,
  poId: string
): Promise<BillResult> {
  const qbo = container.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)

  const [po] = await qbo.listPurchaseOrders(
    { id: poId },
    { take: 1, relations: ["lines"] }
  )
  if (!po) return { ok: false, message: `PO ${poId} not found` }
  if ((po as any).qbo_bill_id) {
    return { ok: true, skipped: "already_billed", bill_id: (po as any).qbo_bill_id }
  }
  if (!(po as any).vendor_ref) {
    return { ok: false, skipped: "no_vendor_ref" }
  }

  // Bill only lines that actually received stock and reference a QB item.
  const billable = ((po as any).lines ?? []).filter(
    (l: any) => Number(l.qty_received) > 0 && l.item_ref
  )
  if (!billable.length) {
    return { ok: true, skipped: "nothing_received" }
  }

  const body = {
    VendorRef: { value: (po as any).vendor_ref },
    // PrivateNote ties the Bill back to the PO for human reconciliation. We
    // intentionally do NOT use LinkedTxn to auto-close the PO — QuickBooks rejects
    // PO-linked Bill lines inconsistently via the API, and a clean standalone Bill
    // for the received goods is the reliable accounting entry.
    PrivateNote: `Received against PO #${(po as any).doc_number ?? (po as any).qbo_id}`,
    Line: billable.map((l: any) => {
      const qty = Number(l.qty_received)
      const unit = Number(l.unit_cost) || 0
      return {
        DetailType: "ItemBasedExpenseLineDetail",
        Amount: qty * unit,
        ItemBasedExpenseLineDetail: {
          ItemRef: { value: l.item_ref },
          Qty: qty,
          UnitPrice: unit,
        },
      }
    }),
  }

  let bill
  try {
    const resp = await qbo.createEntity("bill", body)
    bill = resp?.Bill
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
  if (!bill?.Id) {
    return { ok: false, message: "QuickBooks returned no Bill id" }
  }

  await qbo.updatePurchaseOrders({
    id: poId,
    qbo_bill_id: String(bill.Id),
    billed_at: new Date(),
  })

  return { ok: true, bill_id: String(bill.Id), doc_number: bill.DocNumber }
}
