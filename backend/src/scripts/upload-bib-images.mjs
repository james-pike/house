#!/usr/bin/env node
/**
 * Upload locally downloaded bib images to R2, convert to WebP,
 * and attach to Medusa products with color_images metadata.
 */

import fs from "fs"
import path from "path"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import sharp from "sharp"

const R2_ACCOUNT_ID = "d3d227d74f04b6b9762fe5f6585fa7f8"
const R2_ACCESS_KEY_ID = "87b42ccbea14098ccb091dae2f62dc56"
const R2_SECRET_ACCESS_KEY = "1cf29c5411689b07a3b9bdfafa2684a820ce43c06b1fb69e2a0720ffb5dc2de1"
const R2_BUCKET = "product-images"
const R2_PUBLIC_URL = "https://pub-8a2192b4a4e14435b4cc7037de30a086.r2.dev"

const MEDUSA_URL = "https://house-qvr4.onrender.com"
const DOWNLOAD_DIR = "backend/data/vault-images"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Build UPC data for color code -> color name mapping
const upcData = JSON.parse(fs.readFileSync("backend/data/upc-lookup.json", "utf8"))
const entries = Object.values(upcData).filter(e => e.brand === "Carhartt")
const colorCodeToName = new Map()
for (const e of entries) {
  const parts = e.material_number.split("-")
  const colorCode = parts.slice(1).join("-")
  if (colorCode && e.color) colorCodeToName.set(colorCode.toUpperCase(), e.color)
}

// Bib styles
const BIB_STYLES = [
  "101626", "101627", "102691", "102776", "102987",
  "103042", "104031", "104049", "104672", "104674",
  "106001", "106235", "106671", "106672", "107619",
]

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

async function uploadToR2(key, webpBuffer) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: webpBuffer,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }))
  return `${R2_PUBLIC_URL}/${key}`
}

async function medusaLogin() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@safetyhouse.ca", password: "inventory" }),
  })
  const data = await res.json()
  return data.token
}

async function getAllProducts(token) {
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
  return products
}

// ── Main ──
async function main() {
  const token = await medusaLogin()
  console.log("Logged into Medusa")

  const products = await getAllProducts(token)
  const bibs = products.filter(p => /bib/i.test(p.title))
  console.log(`Found ${bibs.length} bib products in Medusa\n`)

  // Build barcode -> material_number lookup
  const barcodeToMaterial = new Map()
  for (const e of entries) {
    if (e.upc) barcodeToMaterial.set(e.upc, e.material_number)
  }

  // Map style -> Medusa product
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

  console.log(`Mapped ${styleToProduct.size} styles to products\n`)

  let totalUploaded = 0, totalAttached = 0

  for (const style of BIB_STYLES) {
    const product = styleToProduct.get(style)
    if (!product) {
      console.log(`${style}: no matching Medusa product found, skipping`)
      continue
    }

    // Find local images for this style
    const localFiles = fs.readdirSync(DOWNLOAD_DIR).filter(f =>
      f.startsWith(style + "_") && (f.endsWith(".jpg") || f.endsWith(".tif"))
    )

    if (localFiles.length === 0) {
      console.log(`${style} "${product.title}": no local images`)
      continue
    }

    console.log(`\n── ${style} "${product.title}" — ${localFiles.length} images`)

    const imageUrls = []
    const colorImages = {}

    for (const file of localFiles) {
      const colorCode = file.replace(style + "_", "").replace(/\.(jpg|tif)$/, "")
      const colorName = colorCodeToName.get(colorCode.toUpperCase()) || colorCode
      const r2Key = `carhartt/${style}/${style}_${colorCode}.webp`

      try {
        const buffer = fs.readFileSync(path.join(DOWNLOAD_DIR, file))
        const webpBuffer = await sharp(buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()

        const url = await uploadToR2(r2Key, webpBuffer)
        imageUrls.push(url)
        colorImages[colorName] = url
        totalUploaded++
        console.log(`  ${colorCode} (${colorName}): ${(webpBuffer.length / 1024).toFixed(0)} KB -> R2`)
      } catch (err) {
        console.log(`  ${colorCode}: FAILED — ${err.message}`)
      }
    }

    if (imageUrls.length === 0) continue

    // Get existing non-vault images
    const existing = (product.images || [])
      .map(img => img.url)
      .filter(url => !url.includes("r2.dev/carhartt/"))
    const allUrls = [...new Set([...existing, ...imageUrls])]

    // Attach images
    const imgRes = await fetch(`${MEDUSA_URL}/admin/products/${product.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ images: allUrls.map(url => ({ url })) }),
    })

    if (imgRes.ok) {
      console.log(`  Attached ${imageUrls.length} images`)
      totalAttached += imageUrls.length

      // Save color_images metadata
      const metaRes = await fetch(`${MEDUSA_URL}/admin/products/${product.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { ...product.metadata, color_images: colorImages },
        }),
      })
      if (metaRes.ok) console.log(`  Saved color_images (${Object.keys(colorImages).length} colors)`)
    } else {
      console.log(`  FAILED to attach: ${imgRes.status}`)
    }

    await sleep(800)
  }

  console.log(`\n── Done: ${totalUploaded} uploaded, ${totalAttached} attached ──`)
}

main().catch(console.error)
