import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_URL = "https://house-qvr4.onrender.com"

// Login
const authRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@safetyhouse.ca", password: "inventory" }),
})
const { token: TOKEN } = await authRes.json()
if (!TOKEN) { console.error("Login failed"); process.exit(1) }
console.log("Logged in\n")

// ── Step 1: Delete all products ──
console.log("=== WIPING ALL PRODUCTS ===")
let deleted = 0
while (true) {
  const res = await fetch(`${BACKEND_URL}/admin/products?limit=50&fields=id`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const data = await res.json()
  if (!data.products || data.products.length === 0) break

  for (const p of data.products) {
    const delRes = await fetch(`${BACKEND_URL}/admin/products/${p.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (delRes.ok) {
      deleted++
      process.stdout.write(`\r  Deleted ${deleted} products`)
    } else {
      console.log(`\n  FAIL deleting ${p.id}: ${delRes.status}`)
    }
  }
}
console.log(`\n  Done. Deleted ${deleted} products.\n`)

// ── Step 2: Get category IDs ──
console.log("=== LOADING CATEGORIES ===")
const catRes = await fetch(`${BACKEND_URL}/admin/product-categories?limit=20`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
})
const catData = await catRes.json()
const categoryMap = {}
for (const c of catData.product_categories || []) {
  categoryMap[c.handle] = c.id
  console.log(`  ${c.handle} → ${c.id} (${c.name})`)
}
console.log()

// ── Step 3: Seed 10 per brand with categories ──
console.log("=== SEEDING PRODUCTS ===")
const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))
const entries = Object.values(lookup)

const byBrand = {}
for (const e of entries) {
  if (!byBrand[e.brand]) byBrand[e.brand] = {}
  if (!byBrand[e.brand][e.material_number]) byBrand[e.brand][e.material_number] = e
}

const picks = []
for (const [brand, styles] of Object.entries(byBrand)) {
  const all = Object.values(styles)
  all.sort(() => Math.random() - 0.5)
  picks.push(...all.slice(0, 10))
}

console.log(`Seeding ${picks.length} products across ${Object.keys(byBrand).length} brands...\n`)

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
    care_instructions: entry.care_instructions || undefined,
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
      const status = data.variant_added ? "variant" : "NEW"
      const catName = entry.category_handle || "none"
      console.log(`  OK  [${status.padEnd(7)}] ${entry.brand.padEnd(16)} | ${suggested_title.substring(0, 45).padEnd(47)} | ${catName.padEnd(18)} | $${(price / 100).toFixed(2)}`)
      ok++
    } else {
      const text = await res.text()
      console.log(`  FAIL ${entry.brand.padEnd(16)} | ${suggested_title.substring(0, 45)} | ${res.status}: ${text.substring(0, 100)}`)
      fail++
    }
  } catch (e) {
    console.log(`  ERR  ${entry.brand} | ${e.message}`)
    fail++
  }
}

console.log(`\nDone! ${ok} created, ${fail} failed.`)
