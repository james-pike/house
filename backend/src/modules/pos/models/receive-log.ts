import { model } from "@medusajs/framework/utils"

const ReceiveLog = model.define("receive_log", {
  id: model.id().primaryKey(),
  product_title: model.text(),
  variant_title: model.text(),
  sku: model.text().nullable(),
  barcode: model.text().nullable(),
  quantity_added: model.number(),
  new_stock: model.number().default(0),
  received_at: model.dateTime(),
})

export default ReceiveLog
