import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  adjustVariantInventory,
  ReceiveError,
} from "../../../../lib/adjust-inventory"

// POST /admin/pos/receive - Ad-hoc inventory receive (increase stock for an
// existing variant). For receiving against a purchase order, use
// POST /admin/pos/purchase-orders/:id/receive instead.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { variant_id, barcode, quantity, location_id } = req.body as {
    variant_id?: string
    barcode?: string
    quantity: number
    location_id?: string
  }

  let result
  try {
    result = await adjustVariantInventory(req.scope, {
      variant_id,
      barcode,
      quantity,
      location_id,
    })
  } catch (e) {
    if (e instanceof ReceiveError) {
      return res.status(e.status).json({ message: e.message })
    }
    throw e
  }

  const { variant: variantData, inventory_level } = result

  // Log to permanent receive log (best-effort).
  try {
    const posModule = req.scope.resolve("pos") as any
    await posModule.createReceiveLogs({
      product_title: variantData.product?.title || "",
      variant_title: variantData.title || "Default",
      sku: variantData.sku || null,
      barcode: variantData.barcode || null,
      quantity_added: quantity,
      new_stock: inventory_level?.stocked_quantity || 0,
      received_at: new Date(),
    })
  } catch {
    /* logging is best-effort */
  }

  res.status(200).json({
    variant: {
      id: variantData.id,
      title: variantData.title,
      sku: variantData.sku,
      barcode: variantData.barcode,
      product_title: variantData.product?.title,
    },
    quantity_added: quantity,
    inventory_level,
  })
}
