import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncPurchaseOrders } from "../../../../../lib/sync-purchase-orders"

// POST /admin/pos/quickbooks/sync-pos — pull purchase orders from QuickBooks now.
// Same logic the cron job runs; exposed so you can trigger a sync on demand.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const summary = await syncPurchaseOrders(req.scope)
    res.json({ ok: true, ...summary })
  } catch (e) {
    res.status(400).json({ ok: false, message: (e as Error).message })
  }
}
