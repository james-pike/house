import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QUICKBOOKS_MODULE } from "../../../../../modules/quickbooks"
import type QuickbooksModuleService from "../../../../../modules/quickbooks/service"
import { syncSales } from "../../../../../lib/sync-sales"

// POST /admin/pos/quickbooks/sync-sales — push recent Medusa orders to QuickBooks
// as SalesReceipts now (same logic the nightly job runs).
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { limit } = (req.body ?? {}) as { limit?: number }
  try {
    const summary = await syncSales(req.scope, { limit })
    res.json({ ok: true, ...summary })
  } catch (e) {
    res.status(400).json({ ok: false, message: (e as Error).message })
  }
}

// GET /admin/pos/quickbooks/sync-sales — counts of synced / errored sales.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const qbo = req.scope.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)
  const logs = await qbo.listSalesSyncLogs({}, { take: 100000, select: ["status"] })
  const counts = { synced: 0, error: 0, pending: 0 }
  for (const l of logs as any[]) {
    if (l.status in counts) (counts as any)[l.status]++
  }
  res.json({ counts, total: (logs as any[]).length })
}
