import { model } from "@medusajs/framework/utils"

// Tracks the push of a single Medusa order to QuickBooks as a SalesReceipt.
// One row per order — its existence with status "synced" is the idempotency
// guard that prevents double-posting a sale into the books.
const SalesSyncLog = model.define("qbo_sales_sync_log", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  qbo_doc_id: model.text().nullable(),
  qbo_doc_type: model.text().default("SalesReceipt"),
  status: model.enum(["pending", "synced", "error"]).default("pending"),
  error: model.text().nullable(),
  total: model.bigNumber().default(0),
  synced_at: model.dateTime().nullable(),
})

export default SalesSyncLog
