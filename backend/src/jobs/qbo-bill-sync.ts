import type { MedusaContainer } from "@medusajs/framework/types"
import { QUICKBOOKS_MODULE } from "../modules/quickbooks"
import type QuickbooksModuleService from "../modules/quickbooks/service"
import { pushPurchaseOrderBill } from "../lib/push-bill"

// Nightly sweep: bill any PO that has received stock but hasn't been pushed to
// QuickBooks yet. This is the reliability backstop behind the best-effort push on
// PO close — anything that failed live gets retried here.
export default async function qboBillSyncJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const qbo = container.resolve<QuickbooksModuleService>(QUICKBOOKS_MODULE)

  let candidates: any[] = []
  try {
    // Closed PObills first; we only bill what was received, so a closed PO with
    // no qbo_bill_id is the primary target.
    candidates = await qbo.listPurchaseOrders(
      { closed: true, qbo_bill_id: null },
      { relations: ["lines"], take: 200 }
    )
  } catch (e) {
    logger.warn(`[qbo-bill-sync] could not load POs: ${(e as Error).message}`)
    return
  }

  let billed = 0
  let skipped = 0
  for (const po of candidates) {
    try {
      const r = await pushPurchaseOrderBill(container, po.id)
      if (r.ok && r.bill_id && !r.skipped) billed++
      else skipped++
    } catch (e) {
      logger.warn(`[qbo-bill-sync] PO ${po.id}: ${(e as Error).message}`)
    }
  }
  if (candidates.length) {
    logger.info(`[qbo-bill-sync] billed ${billed}, skipped ${skipped}`)
  }
}

export const config = {
  name: "qbo-bill-sync",
  schedule: "0 2 * * *", // daily at 02:00
}
