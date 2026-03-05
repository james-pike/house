import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { posSaleWorkflow } from "../../../../workflows/pos-sale"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  let {
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

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Auto-resolve location_id
  if (!location_id) {
    const { data: locations } = await query.graph({
      entity: "stock_location",
      fields: ["id"],
    })
    location_id = locations?.[0]?.id
    if (!location_id) {
      const stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION)
      const newLocation = await stockLocationService.createStockLocations({
        name: "Default Store",
      })
      location_id = newLocation.id
    }
  }

  // Auto-resolve region_id
  if (!region_id) {
    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id"],
    })
    region_id = regions?.[0]?.id
  }

  // Auto-resolve sales_channel_id
  if (!sales_channel_id) {
    const { data: channels } = await query.graph({
      entity: "sales_channel",
      fields: ["id"],
    })
    sales_channel_id = channels?.[0]?.id
  }

  const { result } = await posSaleWorkflow(req.scope).run({
    input: {
      session_id,
      items,
      payment_method: payment_method || "cash",
      amount_tendered,
      currency_code: currency_code || "cad",
      region_id: region_id || "",
      sales_channel_id: sales_channel_id || "",
      location_id: location_id || "",
    },
  })

  res.status(200).json({ sale: result })
}
