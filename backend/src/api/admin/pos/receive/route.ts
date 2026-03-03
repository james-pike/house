import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

// POST /admin/pos/receive - Receive inventory (increase stock for existing product)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { variant_id, barcode, quantity, location_id } = req.body as {
    variant_id?: string
    barcode?: string
    quantity: number
    location_id: string
  }

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: "quantity must be a positive number" })
  }
  if (!location_id) {
    return res.status(400).json({ message: "location_id is required" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryService = req.scope.resolve(Modules.INVENTORY)

  // Find the variant
  let variantData: any = null
  if (variant_id) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: [
        "id", "title", "sku", "barcode",
        "product.id", "product.title",
        "inventory_items.inventory.id",
        "inventory_items.inventory.location_levels.*",
      ],
      filters: { id: variant_id },
    })
    variantData = data?.[0]
  } else if (barcode) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: [
        "id", "title", "sku", "barcode",
        "product.id", "product.title",
        "inventory_items.inventory.id",
        "inventory_items.inventory.location_levels.*",
      ],
      filters: { $or: [{ sku: barcode }, { barcode }] },
    })
    variantData = data?.[0]
  }

  if (!variantData) {
    return res.status(404).json({ message: "Product variant not found" })
  }

  // Find the inventory item for this variant
  const inventoryItemId = variantData.inventory_items?.[0]?.inventory?.id
  if (!inventoryItemId) {
    return res.status(400).json({ message: "No inventory item linked to this variant" })
  }

  // Check if inventory level exists at this location
  const locationLevels = variantData.inventory_items?.[0]?.inventory?.location_levels || []
  const existingLevel = locationLevels.find((l: any) => l.location_id === location_id)

  if (!existingLevel) {
    // Create inventory level at this location
    await inventoryService.createInventoryLevels([{
      inventory_item_id: inventoryItemId,
      location_id,
      stocked_quantity: quantity,
    }])
  } else {
    // Adjust existing stock upward
    await inventoryService.adjustInventory(inventoryItemId, location_id, quantity)
  }

  // Fetch updated level
  const { data: updatedLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "stocked_quantity", "reserved_quantity", "location_id"],
    filters: { inventory_item_id: inventoryItemId, location_id },
  })

  res.status(200).json({
    variant: {
      id: variantData.id,
      title: variantData.title,
      sku: variantData.sku,
      barcode: variantData.barcode,
      product_title: variantData.product?.title,
    },
    quantity_added: quantity,
    inventory_level: updatedLevels?.[0] || null,
  })
}
