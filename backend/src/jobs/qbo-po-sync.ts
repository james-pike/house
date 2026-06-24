import type { MedusaContainer } from "@medusajs/framework/types"
import { syncPurchaseOrders } from "../lib/sync-purchase-orders"

// Pull purchase orders from QuickBooks on a schedule so the POS receive screen
// always has fresh POs. No-ops quietly if QuickBooks isn't connected yet.
export default async function qboPoSyncJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  try {
    const summary = await syncPurchaseOrders(container)
    logger.info(
      `[qbo-po-sync] ${summary.purchase_orders} POs, ${summary.lines} lines ` +
        `(${summary.matched} matched, ${summary.unmatched} unmatched)`
    )
  } catch (e) {
    // Not connected / token expired / API hiccup — log and try again next tick.
    logger.warn(`[qbo-po-sync] skipped: ${(e as Error).message}`)
  }
}

export const config = {
  name: "qbo-po-sync",
  schedule: "*/30 * * * *", // every 30 minutes
}
