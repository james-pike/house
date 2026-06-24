import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../modules/quickbooks/service"
import { poState } from "../../../../lib/po-status"

// GET /admin/pos/purchase-orders?receive_status=pending|partial|received|closed
// List mirrored POs with receive progress, match summary, and backorder/over
// flags. Sorted newest first.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  const { receive_status } = req.query as { receive_status?: string }

  const orders = await qbo.listPurchaseOrders(
    {},
    { relations: ["lines"], order: { txn_date: "DESC" } }
  )

  let result = (orders as any[]).map((po) => {
    const lines = po.lines ?? []
    const state = poState(lines, po.closed)
    const matched = lines.filter((l: any) => l.variant_id).length
    const ordered_units = state.lines.reduce((a, l) => a + l.ordered, 0)
    const received_units = state.lines.reduce((a, l) => a + l.received, 0)
    return {
      id: po.id,
      qbo_id: po.qbo_id,
      doc_number: po.doc_number,
      vendor_name: po.vendor_name,
      status: po.status,
      closed: po.closed,
      txn_date: po.txn_date,
      total: po.total,
      synced_at: po.synced_at,
      line_count: lines.length,
      matched_lines: matched,
      unmatched_lines: lines.length - matched,
      ordered_units,
      received_units,
      receive_status: state.receive_status,
      has_backorder: state.has_backorder,
      has_over: state.has_over,
      has_unmatched: state.has_unmatched,
      billed: !!po.qbo_bill_id,
    }
  })

  if (receive_status) {
    result = result.filter((p) => p.receive_status === receive_status)
  }

  res.json({ purchase_orders: result, count: result.length })
}
