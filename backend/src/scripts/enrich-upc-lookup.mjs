/**
 * enrich-upc-lookup.mjs
 *
 * Master script to enrich upc-lookup.json with smart tags and descriptions.
 * Run this after importing a new brand's UPC data to ensure consistency.
 *
 * What it does:
 * 1. Removes redundant tags (e.g. "Safety Footwear" — that's a category, not a tag)
 * 2. Generates descriptions for entries missing them, using brand-specific templates
 * 3. Generates smart tags for entries missing them, based on available data
 *
 * To add a new brand:
 * 1. Add a tagGenerator function in BRAND_TAG_GENERATORS
 * 2. Add a descriptionGenerator function in BRAND_DESC_GENERATORS
 * 3. Run this script
 *
 * Usage: node backend/src/scripts/enrich-upc-lookup.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const lookupPath = path.resolve(__dirname, "../../data/upc-lookup.json")
const lookup = JSON.parse(fs.readFileSync(lookupPath, "utf-8"))

// Tags that should never appear (they duplicate category names or are too generic)
const BANNED_TAGS = ["Safety Footwear", "Footwear", "Clothing", "Apparel"]

// ---------------------------------------------------------------------------
// Brand-specific TAG generators
// Return an array of tags based on the UPC entry data.
// Only called if entry has no tags yet.
// ---------------------------------------------------------------------------

const BRAND_TAG_GENERATORS = {
  "Carhartt": (entry) => {
    const tags = []
    const title = (entry.title || "").toLowerCase()
    const features = (entry.features || "").toLowerCase()
    const fabric = (entry.fabric || "").toLowerCase()
    const fit = entry.fit || ""

    if (title.includes("flame resistant") || title.includes("fr ") || title.startsWith("fr")) tags.push("FR Rated")
    if (fit) tags.push(fit)
    if (features.includes("fastdry") || fabric.includes("fastdry")) tags.push("FastDry")
    if (features.includes("rugged flex") || title.includes("rugged flex")) tags.push("Rugged Flex")
    if (features.includes("force") || title.includes("force")) tags.push("Force")
    if (features.includes("rain defender") || title.includes("rain defender")) tags.push("Rain Defender")
    if (features.includes("storm defender") || title.includes("storm defender")) tags.push("Storm Defender")
    if (features.includes("wind fighter") || title.includes("wind fighter")) tags.push("Wind Fighter")
    if (features.includes("waterproof") || title.includes("waterproof")) tags.push("Waterproof")
    if (features.includes("insulated") || title.includes("insulated")) tags.push("Insulated")
    if (title.includes("high-vis") || title.includes("hi-vis") || title.includes("hv ")) tags.push("Hi-Vis")
    // Accessories
    if (title.includes("cap") || title.includes("beanie") || title.includes("apron") || title.includes("patch") || title.includes("zipper") || title.includes("button kit")) tags.push("Safety Supplies")
    if (title.includes("5 panel") || title.includes("five-panel") || title.includes("5-panel")) tags.push("5 Panel A Frame")
    else if (title.includes("cap") && !title.includes("beanie")) tags.push("6 Panel")

    return tags
  },

  "Timberland PRO": (entry) => {
    const tags = []
    const title = (entry.title || "").toUpperCase()

    if (title.includes(" CT ") || title.includes(" CT,")) tags.push("Composite Toe")
    else if (title.includes(" ST ") || title.includes(" ST,")) tags.push("Steel Toe")
    else if (title.includes(" AT ") || title.includes(" AT,")) tags.push("Alloy Toe")
    if (title.includes(" WP ") || title.includes(" WP,") || title.includes("WATERPROOF")) tags.push("Waterproof")
    if (title.includes("EH") || title.includes("ESR")) tags.push("EH Rated")

    return tags
  },

  "Blundstone": (entry) => {
    const tags = []
    const title = (entry.title || "").toUpperCase()

    if (title.includes("CSA") || title.includes("SAFETY")) tags.push("CSA Approved")
    if (title.includes("STEEL") || entry.material_number?.includes("ST")) tags.push("Steel Toe")
    else if (title.includes("COMPOSITE")) tags.push("Composite Toe")

    return tags
  },

  "Redback": (entry) => {
    const tags = []
    const title = (entry.title || "").toUpperCase()

    if (title.includes("CSA")) tags.push("CSA Approved")
    // Redback steel toe models typically have specific codes
    if (title.includes("RW") || title.includes("STEEL")) tags.push("Steel Toe")

    return tags
  },

  "Keen": (entry) => {
    const tags = []
    const title = (entry.title || "").toUpperCase()
    const category = entry.category || ""
    const toe = entry.toe_type || ""

    if (category) tags.push(category)
    if (toe === "CF" || toe === "Composite Toe") tags.push("Composite Toe")
    else if (toe === "AT" || toe === "Alloy Toe") tags.push("Alloy Toe")
    else if (toe === "ST" || toe === "Steel Toe") tags.push("Steel Toe")
    if (title.includes(" WP ") || title.includes("WATERPROOF")) tags.push("Waterproof")

    // Gender
    const gender = entry.gender || ""
    if (gender === "MEN" || gender === "Men") tags.push("Men's")
    else if (gender === "WOMEN" || gender === "Women") tags.push("Women's")

    return tags
  },
}

// ---------------------------------------------------------------------------
// Brand-specific DESCRIPTION generators
// Return a string description. Only called if entry has no description yet.
// ---------------------------------------------------------------------------

const BRAND_DESC_GENERATORS = {
  // Carhartt already has detailed supplier descriptions — skip

  "Timberland PRO": (entry) => {
    const title = entry.title || ""
    const tags = entry.tags || []
    const parts = [`Timberland PRO ${title}.`]

    const features = []
    if (tags.includes("Composite Toe")) features.push("composite toe protection")
    else if (tags.includes("Steel Toe")) features.push("steel toe protection")
    else if (tags.includes("Alloy Toe")) features.push("alloy toe protection")
    if (tags.includes("Waterproof")) features.push("waterproof construction")
    if (tags.includes("EH Rated")) features.push("electrical hazard rated")

    if (features.length > 0) parts.push(`Features ${features.join(", ")}.`)
    parts.push("CSA-approved professional safety footwear built for demanding work environments.")
    return parts.join(" ")
  },

  "Blundstone": (entry) => {
    const title = entry.title || ""
    const tags = entry.tags || []
    const parts = [`${title}.`]

    const features = []
    if (tags.includes("CSA Approved")) features.push("CSA-approved")
    if (tags.includes("Steel Toe")) features.push("steel toe protection")
    else if (tags.includes("Composite Toe")) features.push("composite toe protection")

    const isCSA = title.includes("CSA") || title.includes("SAFETY") || tags.includes("CSA Approved")
    const isThermal = title.includes("THERMAL")
    const isDress = title.includes("DRESS")
    const isKids = title.includes("KIDS")
    const isWomens = title.includes("WOMENS")

    if (isThermal) features.push("thermal insulated lining")
    if (isDress) features.push("dress boot styling")
    if (features.length > 0) parts.push(`Features ${features.join(", ")}.`)

    if (isKids) parts.push("Premium kids' elastic-sided boot built with Blundstone's signature comfort and durability.")
    else if (isWomens) parts.push("Premium women's elastic-sided boot crafted with Blundstone's signature comfort and quality.")
    else if (isCSA) parts.push("Premium CSA-certified work boot with Blundstone's legendary comfort and durability.")
    else parts.push("Premium elastic-sided boot crafted with Blundstone's signature comfort and quality.")

    return parts.join(" ")
  },

  "Redback": (entry) => {
    const title = entry.title || ""
    const tags = entry.tags || []
    const parts = [`${title}.`]

    const features = []
    if (tags.includes("Steel Toe")) features.push("steel toe protection")
    if (tags.includes("CSA Approved")) features.push("CSA-approved")

    const isCSA = title.includes("CSA") || tags.includes("CSA Approved")
    if (features.length > 0) parts.push(`Features ${features.join(", ")}.`)

    if (isCSA) parts.push("Australian-made CSA-certified work boot built for comfort and all-day performance.")
    else parts.push("Australian-made boot built for comfort and all-day performance.")

    return parts.join(" ")
  },

  "Keen": (entry) => {
    const title = entry.title || ""
    const tags = entry.tags || []
    const gender = entry.gender || ""

    const toeTag = tags.find(t => t.includes("Toe"))
    const toeDesc = toeTag === "Composite Toe" ? "CSA-approved composite toe"
      : toeTag === "Alloy Toe" ? "CSA-approved alloy toe"
      : toeTag === "Steel Toe" ? "CSA-approved steel toe" : ""

    const genderLabel = gender === "MEN" ? "Men's" : gender === "WOMEN" ? "Women's" : ""
    return `KEEN Utility ${title}. ${toeDesc ? toeDesc + ". " : ""}${genderLabel} safety footwear built for comfort and protection.`
  },
}

// ---------------------------------------------------------------------------
// Main processing
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Title normalization — strip embedded color from product titles
// Some suppliers (e.g. Keen) include color in the title field:
//   "CSA Skokie Mid WP - Dark Earth/Black" should be "CSA Skokie Mid WP"
// The color belongs in the `color` field only, not the title.
// ---------------------------------------------------------------------------

function normalizeTitle(entry) {
  if (!entry.title || !entry.color) return
  const color = entry.color.trim()
  if (!color) return

  // Strip trailing " - Color" or " - COLOR" (case-insensitive match)
  const suffix = ` - ${color}`
  if (entry.title.toLowerCase().endsWith(suffix.toLowerCase())) {
    entry.title = entry.title.slice(0, -suffix.length).trim()
    return true
  }

  // Also handle double-dash or extra whitespace variants
  const dashPattern = new RegExp(`\\s*[-–]\\s*${color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
  if (dashPattern.test(entry.title)) {
    entry.title = entry.title.replace(dashPattern, '').trim()
    return true
  }

  return false
}

let stats = { tagsAdded: 0, tagsFixed: 0, descAdded: 0, bannedRemoved: 0, titlesNormalized: 0 }

for (const [upc, entry] of Object.entries(lookup)) {
  const brand = entry.brand

  // 0. Normalize titles — strip embedded color
  if (normalizeTitle(entry)) stats.titlesNormalized++

  // 1. Remove banned tags
  if (entry.tags) {
    const before = entry.tags.length
    entry.tags = entry.tags.filter(t => !BANNED_TAGS.includes(t))
    if (entry.tags.length < before) stats.bannedRemoved += (before - entry.tags.length)
    if (entry.tags.length === 0) delete entry.tags
  }

  // 2. Generate tags if missing and we have a generator
  if ((!entry.tags || entry.tags.length === 0) && BRAND_TAG_GENERATORS[brand]) {
    const tags = BRAND_TAG_GENERATORS[brand](entry)
    if (tags.length > 0) {
      entry.tags = tags.filter(t => !BANNED_TAGS.includes(t))
      stats.tagsAdded++
    }
  }

  // 3. Generate description if missing and we have a generator
  if (!entry.description && BRAND_DESC_GENERATORS[brand]) {
    entry.description = BRAND_DESC_GENERATORS[brand](entry)
    stats.descAdded++
  }
}

fs.writeFileSync(lookupPath, JSON.stringify(lookup, null, 2) + "\n")

console.log("Enrichment complete!")
console.log(`  Titles normalized:   ${stats.titlesNormalized}`)
console.log(`  Banned tags removed: ${stats.bannedRemoved}`)
console.log(`  Tags generated:      ${stats.tagsAdded}`)
console.log(`  Descriptions added:  ${stats.descAdded}`)
console.log(`\nTo push changes to the database, run:`)
console.log(`  node backend/src/scripts/backfill-tags.mjs`)
