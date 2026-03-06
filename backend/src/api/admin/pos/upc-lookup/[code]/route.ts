import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { readFileSync } from "fs"
import { join } from "path"

interface UpcEntry {
  upc: string
  material_number: string
  title: string
  brand: string
  department: string
  gender: string
  subcategory: string
  category_handle: string
  color_code: string
  color_name: string
  size: string
  width: string
  size_scale: string
  wholesale_price: number
}

// Load once at module init — file lives at backend/data/upc-lookup.json
let lookup: Record<string, UpcEntry> | null = null
function getLookup(): Record<string, UpcEntry> {
  if (!lookup) {
    const filePath = join(process.cwd(), "data", "upc-lookup.json")
    lookup = JSON.parse(readFileSync(filePath, "utf-8"))
  }
  return lookup!
}

// GET /admin/pos/upc-lookup/:code - Look up distributor UPC data for autofill
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { code } = req.params
  const data = getLookup()

  const entry = data[code]
  if (!entry) {
    return res.status(404).json({ message: `UPC ${code} not found in distributor catalog` })
  }

  // Resolve the category ID from the handle
  let category_id: string | null = null
  try {
    const productService = req.scope.resolve(Modules.PRODUCT)
    const categories = await productService.listProductCategories(
      { handle: entry.category_handle },
      { select: ["id"], take: 1 }
    )
    category_id = categories?.[0]?.id || null
  } catch {
    // category resolution is optional
  }

  res.json({
    upc_data: {
      ...entry,
      category_id,
      suggested_title: entry.color_name
        ? `${entry.title} - ${entry.color_name}`
        : entry.title,
      suggested_price_cents: Math.round(entry.wholesale_price * 100),
    },
  })
}
