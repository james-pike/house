import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_URL = "https://house-qvr4.onrender.com"
const CATEGORY_ID = "pcat_01KK58WFQTYD6BSH0KZGB810JG" // work-wear

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

// Get all Ashland Bib Overall entries for Carhartt Brown and Black
const entries = Object.values(lookup).filter(e =>
  e.title === "Ashland Bib Overall" &&
  (e.color === "Carhartt Brown" || e.color === "Black")
)

console.log(`Found ${entries.length} Ashland Bib Overall variants to seed (Brown + Black)\n`)

let ok = 0, fail = 0

for (const entry of entries) {
  const price = (entry.map_price && entry.map_price > 0)
    ? Math.round(entry.map_price * 100)
    : entry.wholesale_price > 0
      ? Math.round(entry.wholesale_price * 100)
      : 5000

  const body = {
    title: entry.title,
    barcode: entry.upc,
    sku: entry.material_number || undefined,
    price,
    currency_code: "cad",
    quantity: 1,
    category_id: CATEGORY_ID,
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
    tags: entry.tags || undefined,
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
      ok++
      console.log(`  OK  [${status.padEnd(7)}] ${entry.color.padEnd(18)} | Size: ${entry.size.padEnd(8)} | $${(price / 100).toFixed(2)}`)
    } else {
      fail++
      const text = await res.text()
      console.log(`  FAIL ${entry.color} ${entry.size} — ${res.status}: ${text.substring(0, 100)}`)
    }
  } catch (err) {
    fail++
    console.log(`  ERR  ${entry.color} ${entry.size} — ${err.message}`)
  }

  await new Promise(r => setTimeout(r, 150))
}

console.log(`\nDone: ${ok} ok, ${fail} failed`)
