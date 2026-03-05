import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const POS_CATEGORIES = [
  { name: "Work Wear", handle: "work-wear" },
  { name: "Safety Footwear", handle: "safety-footwear" },
  { name: "Flame Resistant", handle: "flame-resistant" },
  { name: "Casual Wear", handle: "casual-wear" },
  { name: "Safety Supplies", handle: "safety-supplies" },
]

// GET /admin/pos/categories - List POS categories, auto-creating any that are missing
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productService = req.scope.resolve(Modules.PRODUCT)

  const existing = await productService.listProductCategories(
    {},
    { select: ["id", "name", "handle"], take: 100 }
  )

  const existingHandles = new Set(existing.map((c: any) => c.handle))
  const toCreate = POS_CATEGORIES.filter((c) => !existingHandles.has(c.handle))

  if (toCreate.length > 0) {
    for (const cat of toCreate) {
      await productService.createProductCategories({
        name: cat.name,
        handle: cat.handle,
        is_active: true,
      })
    }
  }

  // Re-fetch all to return current state
  const all = await productService.listProductCategories(
    {},
    { select: ["id", "name", "handle"], take: 100 }
  )

  res.json({ categories: all })
}
