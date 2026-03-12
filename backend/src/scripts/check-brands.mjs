import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const lookup = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/upc-lookup.json"), "utf-8"))

const brands = {}
for (const [upc, entry] of Object.entries(lookup)) {
  const b = entry.brand || "Unknown"
  if (!brands[b]) brands[b] = { count: 0, hasTags: 0, hasDesc: 0, sampleTags: null, sampleDesc: null, safetyFootwearTag: 0 }
  brands[b].count++
  if (entry.tags?.length) {
    brands[b].hasTags++
    if (!brands[b].sampleTags) brands[b].sampleTags = entry.tags
    if (entry.tags.includes("Safety Footwear")) brands[b].safetyFootwearTag++
  }
  if (entry.description) {
    brands[b].hasDesc++
    if (!brands[b].sampleDesc) brands[b].sampleDesc = entry.description.substring(0, 100)
  }
}

for (const [b, info] of Object.entries(brands)) {
  console.log(`${b.padEnd(18)} count: ${String(info.count).padStart(5)} | tags: ${String(info.hasTags).padStart(5)} | desc: ${String(info.hasDesc).padStart(5)} | "Safety Footwear" tag: ${info.safetyFootwearTag}`)
  if (info.sampleTags) console.log(`  sample tags: ${info.sampleTags.join(", ")}`)
  if (info.sampleDesc) console.log(`  sample desc: ${info.sampleDesc}`)
}
