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

// Get all Keen entries grouped by material_number (style)
const keenEntries = Object.entries(lookup).filter(([_, v]) => v.brand === "Keen")
const byStyle = {}
for (const [upc, entry] of keenEntries) {
  const key = entry.material_number
  if (!byStyle[key]) byStyle[key] = []
  byStyle[key].push({ upc, ...entry })
}

const styles = Object.keys(byStyle)
console.log(`Found ${keenEntries.length} Keen UPCs across ${styles.length} styles\n`)

// For each style, seed one variant per unique color (pick the first size of each color)
// This creates the product with its first variant, then adds remaining color variants
let created = 0
let variants = 0
let failed = 0

for (const styleNum of styles) {
  const styleVariants = byStyle[styleNum]

  // Group by color to get unique color variants
  const byColor = {}
  for (const v of styleVariants) {
    if (!byColor[v.color]) byColor[v.color] = []
    byColor[v.color].push(v)
  }

  // For each color, pick a representative set of sizes to seed
  for (const [color, colorVariants] of Object.entries(byColor)) {
    // Pick up to 8 sizes per color to keep it reasonable
    const toSeed = colorVariants.slice(0, 8)

    for (const entry of toSeed) {
      const price = (entry.map_price && entry.map_price > 0)
        ? Math.round(entry.map_price * 100)
        : entry.wholesale_price > 0
          ? Math.round(entry.wholesale_price * 100)
          : 5000

      // Don't append color to title — the receive endpoint handles color as a
      // separate field. Title should be the clean product name only.
      const suggested_title = entry.title

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
          if (data.variant_added) variants++
          else created++
          console.log(`  OK  [${status.padEnd(7)}] ${entry.title.substring(0, 45).padEnd(47)} | ${(entry.color || "-").padEnd(22)} | Size: ${(entry.size || "-").toString().padEnd(6)} | $${(price / 100).toFixed(2)}`)
        } else {
          const text = await res.text()
          failed++
          console.log(`  FAIL ${entry.title.substring(0, 45)} | ${res.status}: ${text.substring(0, 100)}`)
        }
      } catch (e) {
        failed++
        console.log(`  ERR  ${entry.title} | ${e.message}`)
      }

      // Small delay to avoid overwhelming the server
      await new Promise(r => setTimeout(r, 100))
    }
  }
}

console.log(`\nDone! Created: ${created} products, ${variants} variants added, ${failed} failed`)
