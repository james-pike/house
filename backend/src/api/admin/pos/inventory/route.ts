import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const location_id = req.query.location_id as string

  if (!location_id) {
    return res.status(400).json({ message: "location_id query param is required" })
  }

  const { data: levels } = await query.graph({
    entity: "inventory_level",
    fields: [
      "id",
      "stocked_quantity",
      "reserved_quantity",
      "incoming_quantity",
      "inventory_item_id",
      "location_id",
    ],
    filters: {
      location_id,
    },
  })

  res.status(200).json({ inventory_levels: levels })
}
