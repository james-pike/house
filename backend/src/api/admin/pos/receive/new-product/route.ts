import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

// POST /admin/pos/receive/new-product - Create a new product from a scanned barcode
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  let {
    title,
    barcode,
    sku,
    price,
    currency_code,
    quantity,
    location_id,
    sales_channel_id,
    category_id,
    size,
    brand,
  } = req.body as {
    title: string
    barcode?: string
    sku?: string
    price: number
    currency_code?: string
    quantity: number
    location_id?: string
    sales_channel_id?: string
    category_id?: string
    size?: string
    brand?: string
  }

  if (!title || price == null) {
    return res.status(400).json({
      message: "title and price are required",
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const cc = currency_code || "cad"

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

  // Auto-resolve sales_channel_id
  if (!sales_channel_id) {
    try {
      const { data: channels } = await query.graph({
        entity: "sales_channel",
        fields: ["id"],
      })
      sales_channel_id = channels?.[0]?.id
    } catch { /* optional */ }
  }

  // Resolve shipping profile (required by workflow)
  let shippingProfileId: string | undefined
  try {
    const fulfillmentService = req.scope.resolve(Modules.FULFILLMENT)
    const profiles = await fulfillmentService.listShippingProfiles({ type: "default" })
    shippingProfileId = profiles?.[0]?.id
  } catch { /* optional */ }

  const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  const generatedSku = sku || (barcode ? `SKU-${barcode}` : `SKU-${Date.now()}`)

  try {
    // Use the Medusa workflow for atomic product + price + sales channel creation
    const { result } = await createProductsWorkflow(req.scope).run({
      input: {
        products: [
          {
            title,
            handle,
            subtitle: brand || undefined,
            status: ProductStatus.PUBLISHED,
            ...(brand ? { metadata: { brand } } : {}),
            category_ids: category_id ? [category_id] : undefined,
            ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
            options: size
              ? [{ title: "Size", values: [size] }]
              : [{ title: "Default", values: ["Default"] }],
            variants: [
              {
                title: size || "Default",
                sku: generatedSku,
                barcode: barcode || undefined,
                options: size ? { Size: size } : { Default: "Default" },
                manage_inventory: true,
                prices: [
                  {
                    amount: price,
                    currency_code: cc,
                  },
                ],
              },
            ],
            ...(sales_channel_id
              ? { sales_channels: [{ id: sales_channel_id }] }
              : {}),
          },
        ],
      },
    })

    const product = result[0]
    const variant = product.variants[0]

    // Set inventory levels (separate workflow since createProducts doesn't handle this)
    try {
      // Find the inventory item that was auto-created for this variant
      const { data: variantData } = await query.graph({
        entity: "product_variant",
        fields: ["inventory_items.inventory.id"],
        filters: { id: variant.id },
      })

      const inventoryItemId = variantData?.[0]?.inventory_items?.[0]?.inventory?.id

      if (inventoryItemId && quantity > 0) {
        await createInventoryLevelsWorkflow(req.scope).run({
          input: {
            inventory_levels: [
              {
                inventory_item_id: inventoryItemId,
                location_id: location_id!,
                stocked_quantity: quantity,
              },
            ],
          },
        })
      }
    } catch (e: any) {
      // Product was created successfully, but inventory level failed — return with warning
      return res.status(201).json({
        product: {
          id: product.id,
          title: product.title,
          handle: product.handle,
          variant_id: variant.id,
          sku: generatedSku,
          barcode: barcode || null,
        },
        price,
        currency_code: cc,
        quantity_stocked: 0,
        location_id,
        warning: `Product created but inventory level failed: ${e.message}`,
      })
    }

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
      currency_code: cc,
      quantity_stocked: quantity || 0,
      location_id,
    })
  } catch (e: any) {
    // Workflow rolled back — no partial product in DB
    return res.status(500).json({
      message: `Failed to create product: ${e.message}`,
    })
  }
}
