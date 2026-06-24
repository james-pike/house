import { model } from "@medusajs/framework/utils"

// One line of a QuickBooks purchase order, mirrored locally so the POS can
// receive against it. `qty_received` and `closed` are the only fields the POS
// writes; the rest are refreshed from QuickBooks on each sync (preserving them).
export const PurchaseOrderLine = model.define("qbo_purchase_order_line", {
  id: model.id().primaryKey(),
  purchase_order: model.belongsTo(() => PurchaseOrder, { mappedBy: "lines" }),
  qbo_line_id: model.text().nullable(),
  item_ref: model.text().nullable(), // QuickBooks Item id (the PO line's ItemRef)
  item_name: model.text().nullable(),
  sku: model.text().nullable(), // QuickBooks Item.Sku — the join key to a Medusa variant
  description: model.text().nullable(),
  qty_ordered: model.number().default(0),
  unit_cost: model.bigNumber().default(0),
  amount: model.bigNumber().default(0),
  variant_id: model.text().nullable(), // matched Medusa variant id, or null if unmatched
  qty_received: model.number().default(0),
  // Short-close a line: stop expecting the remainder (cancels the backorder)
  // even though less than qty_ordered arrived.
  closed: model.boolean().default(false),
  receipts: model.hasMany(() => PurchaseOrderReceipt, { mappedBy: "line" }),
})

// An immutable audit record of a single physical receiving event against a line.
// A line can have many receipts (split deliveries arriving over several days).
export const PurchaseOrderReceipt = model.define("qbo_po_receipt", {
  id: model.id().primaryKey(),
  line: model.belongsTo(() => PurchaseOrderLine, { mappedBy: "receipts" }),
  purchase_order_id: model.text().nullable(),
  variant_id: model.text().nullable(),
  qty: model.number().default(0),
  received_by: model.text().nullable(),
  note: model.text().nullable(),
  received_at: model.dateTime(),
})

// A QuickBooks PurchaseOrder mirrored locally. `status` mirrors QuickBooks;
// `closed` is our own receiving lifecycle (a PO short-closed at the dock).
const PurchaseOrder = model.define("qbo_purchase_order", {
  id: model.id().primaryKey(),
  qbo_id: model.text(),
  doc_number: model.text().nullable(),
  vendor_name: model.text().nullable(),
  vendor_ref: model.text().nullable(),
  status: model.enum(["open", "closed"]).default("open"),
  txn_date: model.dateTime().nullable(),
  total: model.bigNumber().default(0),
  synced_at: model.dateTime().nullable(),
  closed: model.boolean().default(false),
  closed_at: model.dateTime().nullable(),
  received_by: model.text().nullable(),
  // Set once the received quantities have been pushed to QuickBooks as a Bill.
  // Acts as the idempotency guard so we never double-bill a PO.
  qbo_bill_id: model.text().nullable(),
  billed_at: model.dateTime().nullable(),
  lines: model.hasMany(() => PurchaseOrderLine, { mappedBy: "purchase_order" }),
})

export default PurchaseOrder
