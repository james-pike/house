import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

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

  const variant = variants[0] as any

  // If prices weren't resolved through query graph, fetch via price_set link
  if (!variant.prices || variant.prices.length === 0) {
    try {
      const pricingService = req.scope.resolve(Modules.PRICING)
      const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

      // Find the price set linked to this variant
      const links = await link.list({
        [Modules.PRODUCT]: { product_variant_id: variant.id },
        [Modules.PRICING]: {},
      })

      if (links?.length > 0) {
        const priceSetId = (links[0] as any)?.price_set_id ?? (links[0] as any)?.[Modules.PRICING]?.price_set_id
        if (priceSetId) {
          const { data: priceSets } = await query.graph({
            entity: "price_set",
            fields: ["prices.*"],
            filters: { id: priceSetId },
          })
          if (priceSets?.[0]?.prices?.length) {
            variant.prices = priceSets[0].prices
          }
        }
      }
    } catch {
      // prices stay empty — non-fatal
    }
  }

  res.status(200).json({ variant })
}
