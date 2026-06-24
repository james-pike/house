import type { MedusaContainer } from "@medusajs/framework/types"
import { syncSales } from "../lib/sync-sales"

// Nightly push of Medusa sales into QuickBooks as SalesReceipts. No-ops quietly
// if QuickBooks isn't connected.
export default async function qboSalesSyncJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  try {
    const s = await syncSales(container)
    logger.info(
      `[qbo-sales-sync] considered ${s.considered}, synced ${s.synced}, ` +
        `skipped ${s.skipped}, errors ${s.errors}`
    )
  } catch (e) {
    logger.warn(`[qbo-sales-sync] skipped: ${(e as Error).message}`)
  }
}

export const config = {
  name: "qbo-sales-sync",
  schedule: "0 3 * * *", // daily at 03:00 (after the bill sweep)
}
