#!/usr/bin/env node
/**
 * Fix existing Keen products in Medusa:
 * 1. Strip color from product titles (e.g., "CSA Skokie Mid WP - Dark Earth/Black" → "CSA Skokie Mid WP")
 * 2. Update product handles to match the clean title
 *
 * Usage: node backend/src/scripts/fix-keen-titles.mjs
 */

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

// Load UPC data for color lookup
const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))
const keenColors = new Set()
for (const [, entry] of Object.entries(lookup)) {
  if (entry.brand === "Keen" && entry.color) {
    keenColors.add(entry.color.trim())
  }
}
console.log(`Known Keen colors: ${keenColors.size}\n`)

// Get all products
let allProducts = []
let offset = 0
while (true) {
  const res = await fetch(
    `${BACKEND_URL}/admin/products?limit=100&offset=${offset}&expand=variants`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  )
  const data = await res.json()
  if (!data.products || data.products.length === 0) break
  allProducts.push(...data.products)
  if (data.products.length < 100) break
  offset += 100
}

// Filter to Keen products (by brand metadata or title pattern)
const keenProducts = allProducts.filter(p =>
  p.metadata?.brand === "Keen" ||
  p.subtitle === "Keen" ||
  p.title?.includes("KEEN") ||
  p.title?.includes("Keen")
)

console.log(`Found ${keenProducts.length} Keen products\n`)

let fixed = 0
let skipped = 0

for (const product of keenProducts) {
  const title = product.title

  // Check if title has a trailing " - Color" that matches a known Keen color
  const dashMatch = title.match(/^(.+?)\s*-\s*(.+)$/)
  if (!dashMatch) {
    skipped++
    continue
  }

  const cleanTitle = dashMatch[1].trim()
  const colorPart = dashMatch[2].trim()

  // Verify the trailing part is actually a color
  if (!keenColors.has(colorPart)) {
    console.log(`  SKIP "${title}" — "${colorPart}" not a known color`)
    skipped++
    continue
  }

  // Build clean handle
  const newHandle = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  console.log(`  FIX  "${title}" → "${cleanTitle}" (handle: ${newHandle})`)

  const res = await fetch(`${BACKEND_URL}/admin/products/${product.id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: cleanTitle,
      handle: newHandle,
    }),
  })

  if (res.ok) {
    fixed++
  } else {
    const text = await res.text()
    console.log(`    FAIL: ${res.status} ${text.substring(0, 100)}`)
  }

  await new Promise(r => setTimeout(r, 800))
}

console.log(`\nDone! Fixed: ${fixed}, Skipped: ${skipped}`)
