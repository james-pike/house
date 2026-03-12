import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const lookupPath = path.resolve(__dirname, "../../data/upc-lookup.json")
const lookup = JSON.parse(fs.readFileSync(lookupPath, "utf-8"))

let removedSafetyFootwear = 0
let addedDesc = 0

for (const [upc, entry] of Object.entries(lookup)) {
  // 1. Remove "Safety Footwear" tag from all entries
  if (entry.tags?.includes("Safety Footwear")) {
    entry.tags = entry.tags.filter(t => t !== "Safety Footwear")
    if (entry.tags.length === 0) delete entry.tags
    removedSafetyFootwear++
  }

  // 2. Generate descriptions for brands that don't have one
  if (entry.description) continue

  const brand = entry.brand
  const title = entry.title || ""
  const tags = entry.tags || []

  if (brand === "Timberland PRO") {
    // Build description from title + tags
    const parts = []
    parts.push(`Timberland PRO ${title}.`)

    const features = []
    if (tags.includes("Composite Toe")) features.push("composite toe protection")
    else if (tags.includes("Steel Toe")) features.push("steel toe protection")
    else if (tags.includes("Alloy Toe")) features.push("alloy toe protection")
    if (tags.includes("Waterproof")) features.push("waterproof construction")
    if (tags.includes("EH Rated")) features.push("electrical hazard rated")

    if (features.length > 0) {
      parts.push(`Features ${features.join(", ")}.`)
    }

    parts.push("CSA-approved professional safety footwear built for demanding work environments.")
    entry.description = parts.join(" ")
    addedDesc++

  } else if (brand === "Blundstone") {
    const parts = []
    parts.push(`${title}.`)

    const features = []
    if (tags.includes("CSA Approved")) features.push("CSA-approved")
    if (tags.includes("Steel Toe")) features.push("steel toe protection")
    if (tags.includes("Composite Toe")) features.push("composite toe protection")

    // Detect boot type from title
    const isCSA = title.includes("CSA") || title.includes("SAFETY") || tags.includes("CSA Approved")
    const isThermal = title.includes("THERMAL")
    const isDress = title.includes("DRESS")
    const isKids = title.includes("KIDS")
    const isWomens = title.includes("WOMENS")

    if (isThermal) features.push("thermal insulated lining")
    if (isDress) features.push("dress boot styling")

    if (features.length > 0) {
      parts.push(`Features ${features.join(", ")}.`)
    }

    if (isKids) {
      parts.push("Premium kids' elastic-sided boot built with Blundstone's signature comfort and durability.")
    } else if (isWomens) {
      parts.push("Premium women's elastic-sided boot crafted with Blundstone's signature comfort and quality.")
    } else if (isCSA) {
      parts.push("Premium CSA-certified work boot with Blundstone's legendary comfort and durability.")
    } else {
      parts.push("Premium elastic-sided boot crafted with Blundstone's signature comfort and quality.")
    }

    entry.description = parts.join(" ")
    addedDesc++

  } else if (brand === "Redback") {
    const parts = []
    parts.push(`${title}.`)

    const features = []
    if (tags.includes("Steel Toe")) features.push("steel toe protection")
    if (tags.includes("CSA Approved")) features.push("CSA-approved")

    const isCSA = title.includes("CSA") || tags.includes("CSA Approved")

    if (features.length > 0) {
      parts.push(`Features ${features.join(", ")}.`)
    }

    if (isCSA) {
      parts.push("Australian-made CSA-certified work boot built for comfort and all-day performance.")
    } else {
      parts.push("Australian-made boot built for comfort and all-day performance.")
    }

    entry.description = parts.join(" ")
    addedDesc++
  }
}

fs.writeFileSync(lookupPath, JSON.stringify(lookup, null, 2) + "\n")

console.log(`Done!`)
console.log(`  Removed "Safety Footwear" tag from: ${removedSafetyFootwear} entries`)
console.log(`  Added descriptions to: ${addedDesc} entries`)
