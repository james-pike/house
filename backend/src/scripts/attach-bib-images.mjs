#!/usr/bin/env node
/**
 * Attach already-uploaded R2 images to bib products.
 * Images are already on R2 — just needs to update Medusa product records.
 */

const MEDUSA_URL = "https://house-qvr4.onrender.com"
const R2_PUBLIC_URL = "https://pub-8a2192b4a4e14435b4cc7037de30a086.r2.dev"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

import fs from "fs"

// Build color code -> name from UPC data
const upcData = JSON.parse(fs.readFileSync("backend/data/upc-lookup.json", "utf8"))
const entries = Object.values(upcData).filter(e => e.brand === "Carhartt")
const colorCodeToName = new Map()
for (const e of entries) {
  const parts = e.material_number.split("-")
  const colorCode = parts.slice(1).join("-")
  if (colorCode && e.color) colorCodeToName.set(colorCode.toUpperCase(), e.color)
}

// Known R2 images per style (from successful uploads)
const BIB_IMAGES = {
  "101626": ["001", "211", "410"],
  "101627": ["001", "211", "410", "DOV", "V91"],
  "102691": ["211", "410"],
  "102776": ["001", "211", "412", "BRN", "DKB"],
  "102987": ["DKH", "GVL", "NAT"],
  "103042": ["969"],
  "104031": ["BLK", "BRN", "DKB"],
  "104049": ["BLK", "BRN", "DKB", "I26"],
  "104672": ["DST"],
  "104674": ["BLK", "N04"],
  "106001": ["BRN", "N04", "P54"],
  "106235": ["DOV", "N04", "V91"],
  "106671": ["BLK", "BRN"],
  "106672": ["BLK", "BRN", "DNY", "NVY"],
}

async function main() {
  // Login
  const authRes = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@safetyhouse.ca", password: "inventory" }),
  })
  const { token } = await authRes.json()
  if (!token) { console.error("Login failed"); process.exit(1) }
  console.log("Logged in\n")

  // Get all products
  let products = [], offset = 0
  while (true) {
    const res = await fetch(`${MEDUSA_URL}/admin/products?limit=100&offset=${offset}&expand=variants,images`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!data.products || data.products.length === 0) break
    products.push(...data.products)
    if (data.products.length < 100) break
    offset += 100
  }

  const bibs = products.filter(p => /bib/i.test(p.title))
  console.log(`Found ${bibs.length} bib products\n`)

  // Map style -> product via barcodes
  const barcodeToMaterial = new Map()
  for (const e of entries) {
    if (e.upc) barcodeToMaterial.set(e.upc, e.material_number)
  }
  const styleToProduct = new Map()
  for (const p of bibs) {
    for (const v of p.variants || []) {
      const barcode = v.sku || v.barcode
      if (!barcode) continue
      const material = barcodeToMaterial.get(barcode)
      if (material) {
        const style = material.split("-")[0]
        if (!styleToProduct.has(style)) styleToProduct.set(style, p)
      }
    }
  }

  let attached = 0

  for (const [style, colorCodes] of Object.entries(BIB_IMAGES)) {
    const product = styleToProduct.get(style)
    if (!product) {
      console.log(`${style}: no product found`)
      continue
    }

    // Check if already has R2 images
    const existingR2 = (product.images || []).filter(img => img.url.includes(`r2.dev/carhartt/${style}/`))
    if (existingR2.length >= colorCodes.length) {
      console.log(`${style} "${product.title}": already has ${existingR2.length} images, skipping`)
      continue
    }

    const imageUrls = colorCodes.map(cc => `${R2_PUBLIC_URL}/carhartt/${style}/${style}_${cc}.webp`)
    const colorImages = {}
    for (const cc of colorCodes) {
      const name = colorCodeToName.get(cc.toUpperCase()) || cc
      colorImages[name] = `${R2_PUBLIC_URL}/carhartt/${style}/${style}_${cc}.webp`
    }

    // Merge with existing non-vault images
    const existingOther = (product.images || [])
      .map(img => img.url)
      .filter(url => !url.includes(`r2.dev/carhartt/${style}/`))
    const allUrls = [...new Set([...existingOther, ...imageUrls])]

    console.log(`${style} "${product.title}": attaching ${imageUrls.length} images...`)

    try {
      const imgRes = await fetch(`${MEDUSA_URL}/admin/products/${product.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ images: allUrls.map(url => ({ url })) }),
      })

      if (imgRes.ok) {
        // Save color_images metadata
        await fetch(`${MEDUSA_URL}/admin/products/${product.id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            metadata: { ...product.metadata, color_images: colorImages },
          }),
        })
        attached += imageUrls.length
        console.log(`  OK — ${Object.keys(colorImages).length} color mappings saved`)
      } else {
        console.log(`  FAILED: ${imgRes.status}`)
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`)
    }

    await sleep(500)
  }

  console.log(`\nDone: ${attached} images attached`)
}

main().catch(console.error)
