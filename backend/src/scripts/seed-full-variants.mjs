import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_URL = "https://house-qvr4.onrender.com"

const authRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@safetyhouse.ca", password: "inventory" }),
})
const { token: TOKEN } = await authRes.json()
if (!TOKEN) { console.error("Login failed"); process.exit(1) }
console.log("Logged in\n")

// Get category IDs
const catRes = await fetch(`${BACKEND_URL}/admin/product-categories?limit=20`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
})
const catData = await catRes.json()
const categoryMap = {}
for (const c of catData.product_categories || []) {
  categoryMap[c.handle] = c.id
}

const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))
const entries = Object.values(lookup)

// Group all UPCs by brand+material_number (= same product style)
const styles = {}
for (const e of entries) {
  const key = `${e.brand}|${e.material_number}`
  if (!styles[key]) styles[key] = { brand: e.brand, material_number: e.material_number, category_handle: e.category_handle, entries: [] }
  styles[key].entries.push(e)
}

// Pick 5 styles per brand, preferring styles with many variants
const byBrand = {}
for (const style of Object.values(styles)) {
  if (!byBrand[style.brand]) byBrand[style.brand] = []
  byBrand[style.brand].push(style)
}

const pickedStyles = []
for (const [brand, brandStyles] of Object.entries(byBrand)) {
  // Sort by number of variants descending so we get the fullest product lines
  brandStyles.sort((a, b) => b.entries.length - a.entries.length)
  // Take top 5 styles (most variants)
  pickedStyles.push(...brandStyles.slice(0, 5))
}

// Count total UPCs to seed
const totalUPCs = pickedStyles.reduce((s, st) => s + st.entries.length, 0)
console.log(`Seeding ${pickedStyles.length} styles (${totalUPCs} total variants) across ${Object.keys(byBrand).length} brands...\n`)

let ok = 0, fail = 0, skip = 0

for (const style of pickedStyles) {
  const first = style.entries[0]
  console.log(`\n  ${style.brand} | ${first.title.substring(0, 50)} | ${style.entries.length} variants`)

  for (const entry of style.entries) {
    const price = (entry.map_price && entry.map_price > 0)
      ? Math.round(entry.map_price * 100)
      : entry.wholesale_price > 0
        ? Math.round(entry.wholesale_price * 100)
        : 5000

    const suggested_title = entry.color ? `${entry.title} - ${entry.color}` : entry.title
    const category_id = categoryMap[entry.category_handle] || undefined

    const body = {
      title: suggested_title,
      barcode: entry.upc,
      sku: entry.material_number || undefined,
      price,
      currency_code: "cad",
      quantity: 1,
      category_id,
      size: entry.size || undefined,
      brand: entry.brand || undefined,
      color: entry.color || undefined,
      material_number: entry.material_number || undefined,
      width: entry.width || undefined,
      description: entry.description || undefined,
      features: entry.features || undefined,
      fabric: entry.fabric || undefined,
      fit: entry.fit || undefined,
    }

    try {
      const res = await fetch(`${BACKEND_URL}/admin/pos/receive/new-product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        ok++
      } else {
        const text = await res.text()
        if (text.includes("already")) {
          skip++
        } else {
          fail++
          console.log(`    FAIL ${entry.size || "-"} ${entry.color || "-"}: ${text.substring(0, 80)}`)
        }
      }
    } catch (e) {
      fail++
    }
  }
  console.log(`    → ${ok} ok, ${skip} existing, ${fail} errors`)
}

console.log(`\n\nDone! ${ok} created, ${skip} already existed, ${fail} failed.`)
