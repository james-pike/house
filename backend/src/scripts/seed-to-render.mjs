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

const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))
const entries = Object.values(lookup)

// Group by brand, pick unique products (by material_number), then take 10
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

for (const entry of picks) {
  const price = (entry.map_price && entry.map_price > 0)
    ? Math.round(entry.map_price * 100)
    : entry.wholesale_price > 0
      ? Math.round(entry.wholesale_price * 100)
      : 5000
  const suggested_title = entry.color ? `${entry.title} - ${entry.color}` : entry.title

  const body = {
    title: suggested_title,
    barcode: entry.upc,
    sku: entry.material_number || undefined,
    price,
    currency_code: "cad",
    quantity: 1,
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
      console.log(`  OK  [${status.padEnd(7)}] ${entry.brand.padEnd(16)} | ${suggested_title.substring(0, 50).padEnd(52)} | Size: ${(entry.size || "-").toString().padEnd(6)} | $${(price / 100).toFixed(2)}`)
    } else {
      const text = await res.text()
      console.log(`  FAIL ${entry.brand.padEnd(16)} | ${suggested_title.substring(0, 50)} | ${res.status}: ${text.substring(0, 120)}`)
    }
  } catch (e) {
    console.log(`  ERR  ${entry.brand} | ${e.message}`)
  }
}

console.log("\nDone!")
