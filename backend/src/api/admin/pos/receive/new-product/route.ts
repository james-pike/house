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
    color,
    material_number,
    width,
    description,
    features,
    care_instructions,
    fabric,
    fit,
    origin,
    fr,
    hi_vis,
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
    color?: string
    material_number?: string
    width?: string
    description?: string
    features?: string
    care_instructions?: string
    fabric?: string
    fit?: string
    origin?: string
    fr?: boolean
    hi_vis?: boolean
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

  // Strip color from handle so different colors of the same product share one listing
  const baseTitle = title.replace(/\s*-\s*[^-]+$/, "") // "FR Force Shirt - Dark Navy" → "FR Force Shirt"
  const handle = baseTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  const generatedSku = sku || (barcode ? `SKU-${barcode}` : `SKU-${Date.now()}`)

  // Check if a product with this handle already exists — if so, add a variant
  {
    let existingProducts: any[] = []
    try {
      const result = await query.graph({
        entity: "product",
        fields: ["id", "title", "options.*", "options.values.*"],
        filters: { handle },
      })
      existingProducts = result.data || []
    } catch {
      // handle lookup failed — fall through to create new product
    }

    if (existingProducts.length > 0) {
      const product = existingProducts[0]
      const productService = req.scope.resolve(Modules.PRODUCT)

      // Build variant options from size and/or color
      const variantOptions: Record<string, string> = {}
      const variantTitleParts: string[] = []

      if (size) {
        variantOptions["Size"] = size
        variantTitleParts.push(size)
        const sizeOpt = product.options?.find((o: any) => o.title === "Size")
        if (!sizeOpt) {
          const defaultOpt = product.options?.find((o: any) => o.title === "Default")
          if (defaultOpt) {
            await productService.updateProductOptions(defaultOpt.id, { title: "Size", values: [{ value: size }] } as any)
          } else {
            await productService.createProductOptions({ product_id: product.id, title: "Size", values: [size] } as any)
          }
        } else {
          // Option exists — ensure this value is in it
          const hasValue = sizeOpt.values?.some((v: any) => v.value === size)
          if (!hasValue) {
            await productService.updateProductOptions(sizeOpt.id, {
              values: [...(sizeOpt.values || []).map((v: any) => ({ value: v.value })), { value: size }],
            } as any)
          }
        }
      }

      if (color) {
        variantOptions["Color"] = color
        variantTitleParts.push(color)
        const colorOpt = product.options?.find((o: any) => o.title === "Color")
        if (!colorOpt) {
          await productService.createProductOptions({ product_id: product.id, title: "Color", values: [color] } as any)
        } else {
          const hasValue = colorOpt.values?.some((v: any) => v.value === color)
          if (!hasValue) {
            await productService.updateProductOptions(colorOpt.id, {
              values: [...(colorOpt.values || []).map((v: any) => ({ value: v.value })), { value: color }],
            } as any)
          }
        }
      }

      if (Object.keys(variantOptions).length === 0) {
        variantOptions["Default"] = "Default"
        variantTitleParts.push("Default")
      }

      const { createProductVariantsWorkflow } = await import("@medusajs/medusa/core-flows")
      const { result: variantResult } = await createProductVariantsWorkflow(req.scope).run({
        input: {
          product_variants: [{
            product_id: product.id,
            title: variantTitleParts.join(" / "),
            sku: generatedSku,
            barcode: barcode || undefined,
            options: variantOptions,
            manage_inventory: true,
            prices: [{ amount: price, currency_code: cc }],
          }],
        },
      })

      const variant = variantResult[0]

      // Set inventory
      try {
        const { data: variantData } = await query.graph({
          entity: "product_variant",
          fields: ["inventory_items.inventory.id"],
          filters: { id: variant.id },
        })
        const inventoryItemId = variantData?.[0]?.inventory_items?.[0]?.inventory?.id
        if (inventoryItemId && quantity > 0) {
          await createInventoryLevelsWorkflow(req.scope).run({
            input: {
              inventory_levels: [{
                inventory_item_id: inventoryItemId,
                location_id: location_id!,
                stocked_quantity: quantity,
              }],
            },
          })
        }
      } catch (e: any) {
        return res.status(201).json({
          product: { id: product.id, title: product.title, handle, variant_id: variant.id, sku: generatedSku, barcode: barcode || null },
          price, currency_code: cc, quantity_stocked: 0, location_id,
          variant_added: true,
          warning: `Variant added but inventory failed: ${e.message}`,
        })
      }

      return res.status(201).json({
        product: { id: product.id, title: product.title, handle, variant_id: variant.id, sku: generatedSku, barcode: barcode || null },
        price, currency_code: cc, quantity_stocked: quantity || 0, location_id,
        variant_added: true,
      })
    }
  }

  try {
    // Build options array from size and color
    const productOptions: { title: string; values: string[] }[] = []
    const variantOptions: Record<string, string> = {}
    const variantTitleParts: string[] = []

    if (size) {
      productOptions.push({ title: "Size", values: [size] })
      variantOptions["Size"] = size
      variantTitleParts.push(size)
    }
    if (color) {
      productOptions.push({ title: "Color", values: [color] })
      variantOptions["Color"] = color
      variantTitleParts.push(color)
    }
    if (productOptions.length === 0) {
      productOptions.push({ title: "Default", values: ["Default"] })
      variantOptions["Default"] = "Default"
      variantTitleParts.push("Default")
    }

    // Use the Medusa workflow for atomic product + price + sales channel creation
    const { result } = await createProductsWorkflow(req.scope).run({
      input: {
        products: [
          {
            title: baseTitle,
            handle,
            subtitle: brand || undefined,
            description: description || undefined,
            status: ProductStatus.PUBLISHED,
            metadata: {
              ...(brand ? { brand } : {}),
              ...(color ? { color } : {}),
              ...(material_number ? { material_number } : {}),
              ...(width ? { width } : {}),
              ...(features ? { features } : {}),
              ...(care_instructions ? { care_instructions } : {}),
              ...(fabric ? { fabric } : {}),
              ...(fit ? { fit } : {}),
              ...(origin ? { origin } : {}),
              ...(fr ? { fr } : {}),
              ...(hi_vis ? { hi_vis } : {}),
            },
            category_ids: category_id ? [category_id] : undefined,
            ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
            options: productOptions,
            variants: [
              {
                title: variantTitleParts.join(" / "),
                sku: generatedSku,
                barcode: barcode || undefined,
                options: variantOptions,
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
