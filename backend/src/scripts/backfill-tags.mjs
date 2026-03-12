import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_URL = "https://house-qvr4.onrender.com"

// Load UPC lookup
const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))
console.log(`Loaded ${Object.keys(lookup).length} UPC entries\n`)

// Login
const authRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@safetyhouse.ca", password: "inventory" }),
})
const { token: TOKEN } = await authRes.json()
if (!TOKEN) { console.error("Login failed"); process.exit(1) }
console.log("Logged in\n")

// Fetch all products with their variants (to get barcodes)
let offset = 0
const limit = 100
let allProducts = []

while (true) {
  const res = await fetch(`${BACKEND_URL}/admin/products?limit=${limit}&offset=${offset}&fields=id,title,description,metadata,variants.barcode,variants.sku`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const data = await res.json()
  const products = data.products || []
  if (products.length === 0) break
  allProducts.push(...products)
  offset += limit
  if (products.length < limit) break
}

console.log(`Found ${allProducts.length} total products\n`)

let updated = 0
let noMatch = 0
let noChanges = 0
let failed = 0

for (const p of allProducts) {
  // Find UPC data from any variant's barcode
  let upcData = null
  for (const v of (p.variants || [])) {
    const barcode = v.barcode || v.sku
    if (barcode && lookup[barcode]) {
      upcData = lookup[barcode]
      break
    }
  }

  if (!upcData) {
    noMatch++
    continue
  }

  // Build update payload
  const update = {}
  const newMeta = { ...p.metadata }
  let metaChanged = false

  // Update tags (remove Safety Footwear, add new tags)
  const newTags = upcData.tags || []
  const oldTags = p.metadata?.tags || []
  const oldHadSafetyFootwear = oldTags.includes("Safety Footwear")
  if (JSON.stringify(newTags) !== JSON.stringify(oldTags)) {
    newMeta.tags = newTags.length > 0 ? newTags : undefined
    metaChanged = true
  }

  // Backfill metadata fields
  for (const field of ["brand", "features", "care_instructions", "fabric", "fit", "origin"]) {
    if (!newMeta[field] && upcData[field]) {
      newMeta[field] = upcData[field]
      metaChanged = true
    }
  }

  if (metaChanged) update.metadata = newMeta

  // Update product description if missing and UPC has one
  if (!p.description && upcData.description) {
    update.description = upcData.description
  }

  if (Object.keys(update).length === 0) {
    noChanges++
    continue
  }

  try {
    const res = await fetch(`${BACKEND_URL}/admin/products/${p.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(update),
    })

    if (res.ok) {
      updated++
      const brand = newMeta.brand || upcData.brand || "?"
      const what = []
      if (update.metadata) what.push("tags")
      if (update.description) what.push("desc")
      console.log(`  OK  [${brand.padEnd(16)}] ${p.title.substring(0, 50).padEnd(52)} | ${what.join("+")}`)
    } else {
      const text = await res.text()
      failed++
      console.log(`  FAIL ${p.title} | ${res.status}: ${text.substring(0, 100)}`)
    }
  } catch (e) {
    failed++
    console.log(`  ERR  ${p.title} | ${e.message}`)
  }

  // Longer delay to avoid overwhelming Render free tier
  await new Promise(r => setTimeout(r, 800))
}

console.log(`\nDone!`)
console.log(`  Updated:      ${updated}`)
console.log(`  No changes:   ${noChanges}`)
console.log(`  No UPC match: ${noMatch}`)
console.log(`  Failed:       ${failed}`)
console.log(`  Total:        ${allProducts.length}`)
