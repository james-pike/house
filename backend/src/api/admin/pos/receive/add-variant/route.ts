import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createProductVariantsWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

// POST /admin/pos/receive/add-variant - Add a size variant to an existing product
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  let {
    product_id,
    size,
    barcode,
    sku,
    price,
    currency_code,
    quantity,
    location_id,
  } = req.body as {
    product_id: string
    size: string
    barcode?: string
    sku?: string
    price: number
    currency_code?: string
    quantity: number
    location_id?: string
  }

  if (!product_id || !size || price == null) {
    return res.status(400).json({
      message: "product_id, size, and price are required",
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

  // Look up the product to find/create the Size option
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "options.*"],
    filters: { id: product_id },
  })

  const product = products?.[0]
  if (!product) {
    return res.status(404).json({ message: "Product not found" })
  }

  // Find or note the "Size" option
  let sizeOptionTitle = "Size"
  const existingSizeOption = product.options?.find(
    (o: any) => o.title.toLowerCase() === "size"
  )

  const productService = req.scope.resolve(Modules.PRODUCT)

  // If no Size option exists, create one
  if (!existingSizeOption) {
    const defaultOption = product.options?.find(
      (o: any) => o.title === "Default"
    )
    if (defaultOption) {
      await productService.updateProductOptions(defaultOption.id, {
        title: "Size",
      })
    } else {
      await productService.createProductOptions({
        product_id,
        title: "Size",
        values: [size],
      } as any)
    }
  } else {
    sizeOptionTitle = existingSizeOption.title
  }

  const generatedSku = sku || (barcode ? `SKU-${barcode}` : `SKU-${product_id.slice(-6)}-${size}`)

  try {
    const { result } = await createProductVariantsWorkflow(req.scope).run({
      input: {
        product_variants: [
          {
            product_id,
            title: size,
            sku: generatedSku,
            barcode: barcode || undefined,
            options: { [sizeOptionTitle]: size },
            manage_inventory: true,
            prices: [
              {
                amount: price,
                currency_code: cc,
              },
            ],
          },
        ],
      },
    })

    const variant = result[0]

    // Set inventory levels
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
      return res.status(201).json({
        product: { id: product.id, title: product.title },
        variant: { id: variant.id, title: size, sku: generatedSku, barcode: barcode || null },
        price,
        currency_code: cc,
        quantity_stocked: 0,
        warning: `Variant created but inventory level failed: ${e.message}`,
      })
    }

    res.status(201).json({
      product: { id: product.id, title: product.title },
      variant: { id: variant.id, title: size, sku: generatedSku, barcode: barcode || null },
      price,
      currency_code: cc,
      quantity_stocked: quantity || 0,
    })
  } catch (e: any) {
    return res.status(500).json({
      message: `Failed to add variant: ${e.message}`,
    })
  }
}
