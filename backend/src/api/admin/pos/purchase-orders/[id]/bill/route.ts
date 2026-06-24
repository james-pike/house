import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { pushPurchaseOrderBill } from "../../../../../../lib/push-bill"

// POST /admin/pos/purchase-orders/:id/bill
// Manually push a PO's received quantities to QuickBooks as a Bill. Idempotent.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  try {
    const result = await pushPurchaseOrderBill(req.scope, id)
    res.status(result.ok ? 200 : 400).json(result)
  } catch (e) {
    res.status(400).json({ ok: false, message: (e as Error).message })
  }
}
