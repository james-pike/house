import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_URL = "https://house-qvr4.onrender.com"

// Category IDs
const CATEGORIES = {
  "work-wear": "pcat_01KK58WFQTYD6BSH0KZGB810JG",
  "flame-resistant": "pcat_01KK58WG6EXEE2DMWCKVJ45M1G",
}

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

// Get all Carhartt bib entries
const allBibs = Object.values(lookup).filter(e =>
  e.brand === "Carhartt" && /bib/i.test(e.title)
)

// Group by style (material_number prefix) to show summary
const byStyle = new Map()
for (const e of allBibs) {
  const style = e.material_number.split("-")[0]
  if (!byStyle.has(style)) byStyle.set(style, { title: e.title, cat: e.category_handle, colors: new Set(), count: 0 })
  const s = byStyle.get(style)
  s.colors.add(e.color)
  s.count++
}

console.log(`Found ${allBibs.length} bib variants across ${byStyle.size} styles:\n`)
for (const [style, s] of byStyle) {
  const catId = CATEGORIES[s.cat]
  console.log(`  ${style.padEnd(8)} ${s.title.substring(0, 50).padEnd(52)} ${s.cat.padEnd(16)} ${s.colors.size} colors  ${s.count} SKUs  ${catId ? "OK" : "NO CAT!"}`)
}
console.log("")

let ok = 0, fail = 0, skip = 0

for (const entry of allBibs) {
  const categoryId = CATEGORIES[entry.category_handle]
  if (!categoryId) {
    console.log(`  SKIP ${entry.title} — no category mapping for "${entry.category_handle}"`)
    skip++
    continue
  }

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
    category_id: categoryId,
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
      console.log(`  OK  [${status.padEnd(7)}] ${(entry.color || "").padEnd(18)} | Size: ${(entry.size || "").padEnd(10)} | $${(price / 100).toFixed(2)} | ${entry.title.substring(0, 40)}`)
    } else {
      fail++
      const text = await res.text()
      console.log(`  FAIL ${entry.color} ${entry.size} — ${res.status}: ${text.substring(0, 120)}`)
    }
  } catch (err) {
    fail++
    console.log(`  ERR  ${entry.color} ${entry.size} — ${err.message}`)
  }

  await new Promise(r => setTimeout(r, 150))
}

console.log(`\nDone: ${ok} ok, ${fail} failed, ${skip} skipped`)
