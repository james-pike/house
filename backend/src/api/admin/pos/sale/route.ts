import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { posSaleWorkflow } from "../../../../workflows/pos-sale"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const {
    session_id,
    items,
    payment_method,
    amount_tendered,
    currency_code,
    region_id,
    sales_channel_id,
    location_id,
  } = req.body as any

  if (!session_id || !items?.length) {
    return res
      .status(400)
      .json({ message: "session_id and items are required" })
  }

  const { result } = await posSaleWorkflow(req.scope).run({
    input: {
      session_id,
      items,
      payment_method: payment_method || "cash",
      amount_tendered,
      currency_code: currency_code || "usd",
      region_id,
      sales_channel_id,
      location_id,
    },
  })

  res.status(200).json({ sale: result })
}
