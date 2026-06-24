import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

export type AdjustInventoryInput = {
  variant_id?: string
  barcode?: string
  quantity: number
  location_id?: string
}

export type AdjustInventoryResult = {
  variant: any
  inventory_level: any
  location_id: string
}

// Thrown for expected, client-actionable failures (bad input / not found) so the
// caller can map them to a clean HTTP status instead of a 500.
export class ReceiveError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const VARIANT_FIELDS = [
  "id",
  "title",
  "sku",
  "barcode",
  "product.id",
  "product.title",
  "inventory_items.inventory.id",
  "inventory_items.inventory.location_levels.*",
]

// Resolves a variant (by id or barcode/sku), ensures it has an inventory item and
// a level at the location, and adjusts stock upward by `quantity`. Returns the
// updated level. This is the single source of truth for "add stock" used by both
// ad-hoc receiving and PO receiving.
export async function adjustVariantInventory(
  scope: MedusaContainer,
  input: AdjustInventoryInput
): Promise<AdjustInventoryResult> {
  const { quantity } = input
  if (!quantity || quantity <= 0) {
    throw new ReceiveError(400, "quantity must be a positive number")
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryService = scope.resolve(Modules.INVENTORY)

  // Resolve (or lazily create) a stock location.
  let location_id = input.location_id
  if (!location_id) {
    const { data: locations } = await query.graph({
      entity: "stock_location",
      fields: ["id"],
    })
    location_id = locations?.[0]?.id
    if (!location_id) {
      const stockLocationService = scope.resolve(Modules.STOCK_LOCATION)
      const newLocation = await stockLocationService.createStockLocations({
        name: "Default Store",
      })
      location_id = newLocation.id
    }
  }

  // Find the variant by id or by barcode/sku.
  let variantData: any = null
  if (input.variant_id) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: VARIANT_FIELDS,
      filters: { id: input.variant_id },
    })
    variantData = data?.[0]
  } else if (input.barcode) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: VARIANT_FIELDS,
      filters: { $or: [{ sku: input.barcode }, { barcode: input.barcode }] },
    })
    variantData = data?.[0]
  }

  if (!variantData) {
    throw new ReceiveError(404, "Product variant not found")
  }

  // Ensure an inventory item exists and is linked to the variant. Find-or-create
  // by SKU so a re-run (or partially-created state) doesn't collide.
  let inventoryItemId = variantData.inventory_items?.[0]?.inventory?.id
  if (!inventoryItemId) {
    const link = scope.resolve(ContainerRegistrationKeys.LINK)
    const sku = variantData.sku || `INV-${variantData.id}`
    let invItem = (await inventoryService.listInventoryItems({ sku }))?.[0]
    if (!invItem) {
      const created = await inventoryService.createInventoryItems([{ sku }])
      invItem = created[0]
    }
    try {
      await link.create({
        [Modules.PRODUCT]: { variant_id: variantData.id },
        [Modules.INVENTORY]: { inventory_item_id: invItem.id },
      })
    } catch {
      /* link may already exist */
    }
    inventoryItemId = invItem.id
  }

  // Create the level if missing, otherwise adjust the existing one upward.
  const locationLevels =
    variantData.inventory_items?.[0]?.inventory?.location_levels || []
  const existingLevel = locationLevels.find(
    (l: any) => l.location_id === location_id
  )
  if (!existingLevel) {
    await inventoryService.createInventoryLevels([
      { inventory_item_id: inventoryItemId, location_id, stocked_quantity: quantity },
    ])
  } else {
    await inventoryService.adjustInventory(inventoryItemId, location_id, quantity)
  }

  const { data: updatedLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "stocked_quantity", "reserved_quantity", "location_id"],
    filters: { inventory_item_id: inventoryItemId, location_id },
  })

  return {
    variant: variantData,
    inventory_level: updatedLevels?.[0] || null,
    location_id,
  }
}
