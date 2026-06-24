import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../../modules/quickbooks/service"
import { poState } from "../../../../../lib/po-status"

// GET /admin/pos/purchase-orders/:id — a single PO with full line detail
// (per-line received/remaining/backorder/over/matched state) and the receipt
// history for each line.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)

  const [po] = await qbo.listPurchaseOrders(
    { id },
    { take: 1, relations: ["lines"] }
  )
  if (!po) {
    return res.status(404).json({ message: `Purchase order ${id} not found` })
  }

  const rawLines = (po as any).lines ?? []

  // Pull receipt history for this PO and group it by line.
  const receipts = await qbo.listPurchaseOrderReceipts(
    { purchase_order_id: id },
    { order: { received_at: "ASC" } }
  )
  const receiptsByLine = new Map<string, any[]>()
  for (const r of receipts as any[]) {
    const arr = receiptsByLine.get(r.line_id) ?? []
    arr.push({
      id: r.id,
      qty: Number(r.qty),
      received_by: r.received_by,
      note: r.note,
      received_at: r.received_at,
    })
    receiptsByLine.set(r.line_id, arr)
  }

  // Compute PO + per-line state once so per-line backorder reflects PO context.
  const state = poState(rawLines, (po as any).closed)
  const lines = rawLines.map((l: any, i: number) => ({
    id: l.id,
    qbo_line_id: l.qbo_line_id,
    item_name: l.item_name,
    sku: l.sku,
    description: l.description,
    unit_cost: l.unit_cost,
    amount: l.amount,
    variant_id: l.variant_id,
    closed: l.closed,
    ...state.lines[i],
    receipts: receiptsByLine.get(l.id) ?? [],
  }))

  res.json({
    purchase_order: {
      id: po.id,
      qbo_id: (po as any).qbo_id,
      doc_number: (po as any).doc_number,
      vendor_name: (po as any).vendor_name,
      status: (po as any).status,
      closed: (po as any).closed,
      closed_at: (po as any).closed_at,
      txn_date: (po as any).txn_date,
      total: (po as any).total,
      synced_at: (po as any).synced_at,
      qbo_bill_id: (po as any).qbo_bill_id ?? null,
      billed_at: (po as any).billed_at ?? null,
      ...state,
      lines,
    },
  })
}
