/**
 * Seed a few sample products from each brand via the POS new-product API.
 *
 * Usage:
 *   1. Start the backend:  cd backend && npx medusa develop
 *   2. Get an admin JWT token (or use the one from your POS session)
 *   3. Run:  TOKEN=your_jwt node backend/src/scripts/seed-sample-products.mjs
 *
 * This picks ~3 random products per brand from the UPC lookup and POSTs them
 * to /admin/pos/receive/new-product with qty 1 at their retail/MAP price.
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000"
const TOKEN = process.env.TOKEN

if (!TOKEN) {
  console.error("ERROR: Set TOKEN env var to an admin JWT.\n  TOKEN=xxx node backend/src/scripts/seed-sample-products.mjs")
  process.exit(1)
}

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))

// Group entries by brand, then pick a few unique products (by material_number) per brand
const byBrand = {}
for (const entry of Object.values(lookup)) {
  if (!byBrand[entry.brand]) byBrand[entry.brand] = {}
  // Keep one entry per material_number (style) to get distinct products
  if (!byBrand[entry.brand][entry.material_number]) {
    byBrand[entry.brand][entry.material_number] = entry
  }
}

const samples = []
for (const [brand, styles] of Object.entries(byBrand)) {
  const all = Object.values(styles)
  // Shuffle and pick up to 3
  const shuffled = all.sort(() => Math.random() - 0.5)
  samples.push(...shuffled.slice(0, 3))
}

console.log(`Seeding ${samples.length} sample products across ${Object.keys(byBrand).length} brands...\n`)

// First, ensure categories exist by hitting the categories endpoint
try {
  const catRes = await fetch(`${BACKEND_URL}/admin/pos/categories`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (catRes.ok) {
    const { categories } = await catRes.json()
    console.log(`Categories ready: ${categories.map((c) => c.name).join(", ")}\n`)
  }
} catch (e) {
  console.warn("Warning: could not ensure categories exist:", e.message)
}

for (const entry of samples) {
  const price = entry.wholesale_price > 0 ? Math.round(entry.wholesale_price * 100) : 5000 // $50 fallback for Blundstone (no price)
  const suggested_title = entry.color ? `${entry.title} - ${entry.color}` : entry.title

  const body = {
    title: suggested_title,
    barcode: entry.upc,
    sku: entry.upc,
    price,
    currency_code: "cad",
    quantity: 1,
    size: entry.size || undefined,
    brand: entry.brand,
    color: entry.color || undefined,
    material_number: entry.material_number || undefined,
    width: entry.width || undefined,
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
      console.log(`  OK  ${entry.brand} | ${suggested_title} (${entry.size || "-"}) | $${(price / 100).toFixed(2)} | ${data.variant_added ? "variant added" : "new product"}`)
    } else {
      const text = await res.text()
      console.log(`  FAIL ${entry.brand} | ${suggested_title} | ${res.status}: ${text.slice(0, 120)}`)
    }
  } catch (e) {
    console.log(`  ERR  ${entry.brand} | ${suggested_title} | ${e.message}`)
  }
}

console.log("\nDone!")
