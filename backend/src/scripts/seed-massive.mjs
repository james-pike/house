/**
 * Massive seed: all Timberland, all Blundstone, all Redback, ~3000 Carhartt SKUs
 * Runs 5 concurrent requests for speed.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_URL = "https://house-qvr4.onrender.com"
const CONCURRENCY = 5

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

// Split entries by brand
const timberland = entries.filter(e => e.brand === "Timberland PRO")
const blundstone = entries.filter(e => e.brand === "Blundstone")
const redback = entries.filter(e => e.brand === "Redback")
const carhartt = entries.filter(e => e.brand === "Carhartt")

// For Carhartt, pick styles that give us ~3000 SKUs
// Sort styles by variant count, take the biggest ones first
const carharttStyles = {}
for (const e of carhartt) {
  if (!carharttStyles[e.material_number]) carharttStyles[e.material_number] = []
  carharttStyles[e.material_number].push(e)
}
const sortedStyles = Object.values(carharttStyles).sort((a, b) => b.length - a.length)
let carharttPicks = []
for (const style of sortedStyles) {
  if (carharttPicks.length >= 3000) break
  carharttPicks.push(...style)
}
carharttPicks = carharttPicks.slice(0, 3000)

const allPicks = [...timberland, ...blundstone, ...redback, ...carharttPicks]
console.log(`Total to seed:`)
console.log(`  Timberland PRO: ${timberland.length}`)
console.log(`  Blundstone:     ${blundstone.length}`)
console.log(`  Redback:        ${redback.length}`)
console.log(`  Carhartt:       ${carharttPicks.length}`)
console.log(`  TOTAL:          ${allPicks.length}\n`)

let ok = 0, skip = 0, fail = 0
const startTime = Date.now()

async function seedOne(entry) {
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
    } else {
      const text = await res.text()
      if (text.includes("already") || text.includes("Variant")) {
        skip++
      } else {
        fail++
      }
    }
  } catch {
    fail++
  }

  const total = ok + skip + fail
  if (total % 25 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const rate = (total / (elapsed || 1)).toFixed(1)
    process.stdout.write(`\r  ${total}/${allPicks.length} (${ok} new, ${skip} existing, ${fail} errors) — ${rate}/s — ${elapsed}s`)
  }
}

// Process in batches of CONCURRENCY
for (let i = 0; i < allPicks.length; i += CONCURRENCY) {
  const batch = allPicks.slice(i, i + CONCURRENCY)
  await Promise.all(batch.map(seedOne))
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
console.log(`\n\nDone in ${elapsed}s! ${ok} created, ${skip} already existed, ${fail} failed.`)
