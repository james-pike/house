import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /admin/pos/receive-log — fetch all receive log entries (newest first)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const posModule = req.scope.resolve("pos") as any

  const entries = await posModule.listReceiveLogs(
    {},
    { order: { received_at: "DESC" } }
  )

  res.json({ entries })
}

// POST /admin/pos/receive-log — add a receive log entry
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const {
    product_title,
    variant_title,
    sku,
    barcode,
    quantity_added,
    new_stock,
  } = req.body as {
    product_title: string
    variant_title: string
    sku?: string
    barcode?: string
    quantity_added: number
    new_stock: number
  }

  if (!product_title || !quantity_added) {
    return res.status(400).json({ message: "product_title and quantity_added are required" })
  }

  const posModule = req.scope.resolve("pos") as any

  const entry = await posModule.createReceiveLogs({
    product_title,
    variant_title: variant_title || "Default",
    sku: sku || null,
    barcode: barcode || null,
    quantity_added,
    new_stock: new_stock || 0,
    received_at: new Date(),
  })

  res.status(201).json({ entry })
}
