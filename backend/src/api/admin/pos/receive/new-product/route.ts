import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"

// POST /admin/pos/receive/new-product - Create a new product from a scanned barcode
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const {
    title,
    barcode,
    sku,
    price,
    currency_code,
    quantity,
    location_id,
    sales_channel_id,
    category_id,
  } = req.body as {
    title: string
    barcode?: string
    sku?: string
    price: number
    currency_code: string
    quantity: number
    location_id: string
    sales_channel_id?: string
    category_id?: string
  }

  if (!title || !price || !location_id) {
    return res.status(400).json({
      message: "title, price, and location_id are required",
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productService = req.scope.resolve(Modules.PRODUCT)
  const inventoryService = req.scope.resolve(Modules.INVENTORY)
  const pricingService = req.scope.resolve(Modules.PRICING)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  // Get a shipping profile
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { type: "default" },
  })
  const shippingProfileId = shippingProfiles?.[0]?.id

  // Create the product with a single variant
  const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  const generatedSku = sku || (barcode ? `SKU-${barcode}` : `SKU-${Date.now()}`)

  const [product] = await productService.createProducts([
    {
      title,
      handle,
      status: ProductStatus.PUBLISHED,
      categories: category_id ? [{ id: category_id }] : undefined,
      options: [{ title: "Default", values: ["Default"] }],
      variants: [
        {
          title: "Default",
          sku: generatedSku,
          barcode: barcode || undefined,
          options: { Default: "Default" },
          manage_inventory: true,
        },
      ],
    },
  ])

  const variant = product.variants[0]

  // Create price set and link to variant
  const priceSet = await pricingService.createPriceSets([
    {
      prices: [
        {
          amount: price,
          currency_code: currency_code || "cad",
        },
      ],
    },
  ])

  await link.create({
    [Modules.PRODUCT]: { product_variant_id: variant.id },
    [Modules.PRICING]: { price_set_id: priceSet[0].id },
  })

  // Link product to sales channel if provided
  if (sales_channel_id) {
    await link.create({
      [Modules.PRODUCT]: { product_id: product.id },
      [Modules.SALES_CHANNEL]: { sales_channel_id },
    })
  }

  // Create inventory item and level
  const [inventoryItem] = await inventoryService.createInventoryItems([
    { sku: generatedSku },
  ])

  await link.create({
    [Modules.PRODUCT]: { product_variant_id: variant.id },
    [Modules.INVENTORY]: { inventory_item_id: inventoryItem.id },
  })

  await inventoryService.createInventoryLevels([
    {
      inventory_item_id: inventoryItem.id,
      location_id,
      stocked_quantity: quantity || 0,
    },
  ])

  res.status(201).json({
    product: {
      id: product.id,
      title: product.title,
      handle: product.handle,
      variant_id: variant.id,
      sku: generatedSku,
      barcode: barcode || null,
    },
    price,
    currency_code: currency_code || "cad",
    quantity_stocked: quantity || 0,
    location_id,
  })
}
