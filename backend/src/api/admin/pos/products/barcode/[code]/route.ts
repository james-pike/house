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

  // Always try to resolve prices via the variant-price_set link
  // This handles both seeded and POS-created products reliably
  let resolvedPrices = variant.prices || []

  if (!resolvedPrices.length) {
    try {
      // Query the link table directly to find the price_set_id for this variant
      const { data: variantPriceLinks } = await query.graph({
        entity: "product_variant_price_set",
        fields: ["variant_id", "price_set_id"],
        filters: { variant_id: variant.id },
      })

      const priceSetId = variantPriceLinks?.[0]?.price_set_id
      if (priceSetId) {
        const { data: priceSets } = await query.graph({
          entity: "price_set",
          fields: ["prices.*"],
          filters: { id: priceSetId },
        })
        resolvedPrices = priceSets?.[0]?.prices || []
      }
    } catch {
      // Try alternative: query price_set through the link module
      try {
        const pricingService = req.scope.resolve(Modules.PRICING)
        // List all price sets and find one linked to our variant
        const { data: allLinks } = await query.graph({
          entity: "product_variant",
          fields: ["id", "price_set_link.price_set_id"],
          filters: { id: variant.id },
        })
        const psId = (allLinks?.[0] as any)?.price_set_link?.price_set_id
        if (psId) {
          const { data: priceSets } = await query.graph({
            entity: "price_set",
            fields: ["prices.*"],
            filters: { id: psId },
          })
          resolvedPrices = priceSets?.[0]?.prices || []
        }
      } catch {
        // prices stay empty
      }
    }
  }

  variant.prices = resolvedPrices

  // Add a flat "price" field for easy frontend consumption (amount in smallest currency unit)
  const cadPrice = resolvedPrices.find((p: any) => p.currency_code === "cad")
  const firstPrice = cadPrice || resolvedPrices[0]
  variant.price = firstPrice?.amount ?? null
  variant.currency_code = firstPrice?.currency_code ?? "cad"

  res.status(200).json({ variant })
}
