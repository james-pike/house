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
  console.log(`  ${c.handle} → ${c.name}`)
}
console.log()

const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))
const entries = Object.values(lookup)

// Group by brand+category, pick unique products by material_number
const groups = {}
for (const e of entries) {
  const key = `${e.brand}|${e.category_handle}`
  if (!groups[key]) groups[key] = {}
  if (!groups[key][e.material_number]) groups[key][e.material_number] = e
}

const picks = []
for (const [key, styles] of Object.entries(groups)) {
  const all = Object.values(styles)
  all.sort(() => Math.random() - 0.5)
  // Take up to 20 unique products per brand+category
  picks.push(...all.slice(0, 20))
}

console.log(`Seeding ${picks.length} products...\n`)

let ok = 0, fail = 0
for (const entry of picks) {
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
      ok++
      const cat = entry.category_handle || "none"
      process.stdout.write(`\r  ${ok} created, ${fail} failed`)
    } else {
      fail++
      const text = await res.text()
      console.log(`\n  FAIL ${entry.brand} | ${suggested_title.substring(0, 50)} | ${res.status}: ${text.substring(0, 80)}`)
    }
  } catch (e) {
    fail++
    console.log(`\n  ERR  ${entry.brand} | ${e.message}`)
  }
}

console.log(`\n\nDone! ${ok} created, ${fail} failed.`)
