import { model } from "@medusajs/framework/utils"

export const PosTransaction = model.define("pos_transaction", {
  id: model.id().primaryKey(),
  session: model.belongsTo(() => PosSession, { mappedBy: "transactions" }),
  order_id: model.text().nullable(),
  payment_method: model.enum(["cash", "card"]),
  subtotal: model.bigNumber(),
  tax: model.bigNumber().default(0),
  total: model.bigNumber(),
  amount_tendered: model.bigNumber().nullable(),
  change_given: model.bigNumber().nullable(),
})

const PosSession = model.define("pos_session", {
  id: model.id().primaryKey(),
  cashier_id: model.text(),
  status: model.enum(["open", "closed"]).default("open"),
  opening_cash: model.bigNumber().default(0),
  closing_cash: model.bigNumber().nullable(),
  expected_cash: model.bigNumber().nullable(),
  discrepancy: model.bigNumber().nullable(),
  notes: model.text().nullable(),
  opened_at: model.dateTime(),
  closed_at: model.dateTime().nullable(),
  transactions: model.hasMany(() => PosTransaction, { mappedBy: "session" }),
})

export default PosSession
