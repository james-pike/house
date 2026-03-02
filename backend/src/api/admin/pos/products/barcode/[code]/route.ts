import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { code } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "sku",
      "barcode",
      "product.id",
      "product.title",
      "product.handle",
      "product.thumbnail",
      "prices.*",
      "inventory_items.inventory.location_levels.*",
    ],
    filters: {
      $or: [{ sku: code }, { barcode: code }],
    },
  })

  if (!variants?.length) {
    return res.status(404).json({ message: `No product found for barcode/SKU: ${code}` })
  }

  res.status(200).json({ variant: variants[0] })
}
