#!/usr/bin/env node
/**
 * Attach R2 images to bib products — lightweight version.
 * Fetches products one at a time to avoid overwhelming the server.
 */

const MEDUSA = "https://house-qvr4.onrender.com"
const R2 = "https://pub-8a2192b4a4e14435b4cc7037de30a086.r2.dev"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

import fs from "fs"
const upcData = JSON.parse(fs.readFileSync("backend/data/upc-lookup.json", "utf8"))
const carhartt = Object.values(upcData).filter(e => e.brand === "Carhartt")
const colorCodeToName = new Map()
for (const e of carhartt) {
  const parts = e.material_number.split("-")
  const cc = parts.slice(1).join("-")
  if (cc && e.color) colorCodeToName.set(cc.toUpperCase(), e.color)
}

const TODO = [
  { style: "102691", codes: ["211", "410"] },
  { style: "102776", codes: ["001", "211", "412", "BRN", "DKB"] },
  { style: "102987", codes: ["DKH", "GVL", "NAT"] },
  { style: "103042", codes: ["969"] },
  { style: "104049", codes: ["BLK", "BRN", "DKB", "I26"] },
  { style: "104672", codes: ["DST"] },
  { style: "104674", codes: ["BLK", "N04"] },
]

async function main() {
  const authRes = await fetch(`${MEDUSA}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@safetyhouse.ca", password: "inventory" }),
  })
  const { token } = await authRes.json()
  if (!token) { console.error("Login failed"); process.exit(1) }
  console.log("Logged in\n")

  // Get products in small batches, no expand
  let allProducts = [], offset = 0
  while (true) {
    const res = await fetch(`${MEDUSA}/admin/products?limit=50&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!data.products || !data.products.length) break
    allProducts.push(...data.products)
    if (data.products.length < 50) break
    offset += 50
    await sleep(300)
  }
  const bibs = allProducts.filter(p => /bib/i.test(p.title))
  console.log(`Found ${bibs.length} bib products\n`)

  // For each TODO, find product by fetching variants separately
  for (const item of TODO) {
    // Find which bib product has variants matching this style
    let targetProduct = null
    for (const p of bibs) {
      const vRes = await fetch(`${MEDUSA}/admin/products/${p.id}?expand=variants,images`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!vRes.ok) { console.log(`  ${p.id}: ${vRes.status}`); await sleep(2000); continue }
      const { product } = await vRes.json()
      const hasStyle = (product.variants || []).some(v => (v.sku || "").startsWith(item.style + "-"))
      if (hasStyle) {
        targetProduct = product
        break
      }
      await sleep(200)
    }

    if (!targetProduct) {
      console.log(`${item.style}: no matching product found`)
      continue
    }

    // Check if already has R2 images for this style
    const hasR2 = (targetProduct.images || []).some(img => img.url.includes(`r2.dev/carhartt/${item.style}/`))
    if (hasR2) {
      console.log(`${item.style} "${targetProduct.title}": already has images`)
      continue
    }

    // Build image URLs and color map
    const newUrls = item.codes.map(c => `${R2}/carhartt/${item.style}/${item.style}_${c}.webp`)
    const colorImages = {}
    for (const c of item.codes) {
      const name = colorCodeToName.get(c.toUpperCase()) || c
      colorImages[name] = `${R2}/carhartt/${item.style}/${item.style}_${c}.webp`
    }

    const existingUrls = (targetProduct.images || []).map(img => img.url)
    const allUrls = [...new Set([...existingUrls, ...newUrls])]

    console.log(`${item.style} "${targetProduct.title}": attaching ${newUrls.length} images...`)
    await sleep(2000)

    const imgRes = await fetch(`${MEDUSA}/admin/products/${targetProduct.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ images: allUrls.map(url => ({ url })) }),
    })

    if (imgRes.ok) {
      console.log(`  Images attached`)
      await sleep(1000)
      // Save color_images
      await fetch(`${MEDUSA}/admin/products/${targetProduct.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...targetProduct.metadata, color_images: colorImages } }),
      })
      console.log(`  color_images saved (${Object.keys(colorImages).length} colors)`)
    } else {
      console.log(`  FAILED: ${imgRes.status}`)
    }

    await sleep(2000)
  }

  console.log("\nDone")
}

main().catch(console.error)
