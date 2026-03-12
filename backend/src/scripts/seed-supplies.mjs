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
const supplies = entries.filter(e => e.category_handle === "safety-supplies")
const unique = {}
for (const e of supplies) {
  if (!unique[e.material_number]) unique[e.material_number] = e
}
const products = Object.values(unique)
products.sort(() => Math.random() - 0.5)
const picks = products.slice(0, 10)

console.log(`Seeding ${picks.length} safety supplies...\n`)

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
      const data = await res.json()
      console.log(`  OK  ${entry.brand.padEnd(16)} | ${suggested_title.substring(0, 50).padEnd(52)} | $${(price / 100).toFixed(2)}`)
    } else {
      const text = await res.text()
      console.log(`  FAIL ${entry.brand.padEnd(16)} | ${suggested_title.substring(0, 50)} | ${res.status}: ${text.substring(0, 100)}`)
    }
  } catch (e) {
    console.log(`  ERR  ${entry.brand} | ${e.message}`)
  }
}

console.log("\nDone!")
