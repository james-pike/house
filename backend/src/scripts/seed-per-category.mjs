/**
 * Seed ~200 SKUs per category, picking ALL variants of each style.
 * Groups by material_number, picks styles until we hit ~200 SKUs per category.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_URL = "https://house-qvr4.onrender.com"
const CONCURRENCY = 3
const TARGET_PER_CATEGORY = 200

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
console.log("Categories:", Object.keys(categoryMap).join(", "), "\n")

const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))
const entries = Object.values(lookup)

// Group by category -> style (material_number) -> all variants
const byCategory = {}
for (const e of entries) {
  const cat = e.category_handle || "safety-supplies"
  if (!byCategory[cat]) byCategory[cat] = {}
  if (!byCategory[cat][e.material_number]) byCategory[cat][e.material_number] = []
  byCategory[cat][e.material_number].push(e)
}

let totalToSeed = 0
const picks = []
for (const [catHandle, styles] of Object.entries(byCategory)) {
  if (!categoryMap[catHandle]) {
    console.log(`  Skipping ${catHandle} — no matching category in Medusa`)
    continue
  }
  // Sort styles by variant count (biggest first) for fuller products
  const sortedStyles = Object.values(styles).sort((a, b) => b.length - a.length)
  let catPicks = []
  for (const variants of sortedStyles) {
    if (catPicks.length >= TARGET_PER_CATEGORY) break
    catPicks.push(...variants)
  }
  catPicks = catPicks.slice(0, TARGET_PER_CATEGORY)
  const styleCount = new Set(catPicks.map(e => e.material_number)).size
  console.log(`  ${catHandle}: ${styleCount} styles, ${catPicks.length} total SKUs`)
  picks.push(...catPicks.map(e => ({ ...e, category_handle: catHandle })))
  totalToSeed += catPicks.length
}
console.log(`\nTotal to seed: ${totalToSeed}\n`)

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
    care_instructions: entry.care_instructions || undefined,
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
  if (total % 10 === 0 || total === picks.length) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const rate = (total / (elapsed || 1)).toFixed(1)
    process.stdout.write(`\r  ${total}/${picks.length} (${ok} new, ${skip} existing, ${fail} errors) — ${rate}/s — ${elapsed}s`)
  }
}

// Process in batches
for (let i = 0; i < picks.length; i += CONCURRENCY) {
  const batch = picks.slice(i, i + CONCURRENCY)
  await Promise.all(batch.map(seedOne))
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
console.log(`\n\nDone in ${elapsed}s! ${ok} created, ${skip} already existed, ${fail} failed.`)
