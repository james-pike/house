import XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Timberland PRO ──────────────────────────────────────────────────────
const tblPath = path.resolve(
  __dirname,
  "../../../storefront/public/Copy of 10193767_TBL_ELASTIC_PRO_CA_FTWAPPACC_SP_AO_EN.xlsm"
)

const tblCategoryMap = {
  Footwear: "safety-footwear",
  Apparel: "work-wear",
  Accessories: "safety-supplies",
}

const simpleColorMap = {
  "000": "",
  "001": "Black",
  "065": "Grey",
  "214": "Brown",
  "231": "Wheat",
  "270": "Beige",
  "484": "Blue",
  "827": "Orange",
  D02: "Dark Wheat",
  ECS: "Black/Purple",
  EDU: "Brown/Blue",
  EDW: "Black",
  EDX: "Black/Grey",
  EEA: "Black/Orange",
  EEM: "Black/Grey",
  EFB: "Black/Red",
  EK5: "Black",
  EL0: "Black",
  ELE: "Brown",
  EM4: "Brown",
  EM6: "Rust",
  ENR: "Black",
  EOQ: "Blue",
  EPB: "Brown",
  V96: "Black",
  W01: "Dark Brown",
  W02: "Black",
}

function parseTimberland(lookup) {
  if (!fs.existsSync(tblPath)) {
    console.log("Timberland file not found, skipping")
    return
  }
  const wb = XLSX.readFile(tblPath, { cellDates: true })
  const ws = wb.Sheets["UPC List"]
  const data = XLSX.utils.sheet_to_json(ws)

  let count = 0
  for (const row of data) {
    const upc = (row["UPC Code"] || "").toString().trim()
    if (!upc) continue

    const colorRaw = (row["Color"] || "").toString().trim()
    const colorMatch = colorRaw.match(/^\(([^)]+)\)\s*(.*)$/)
    const colorCode = colorMatch ? colorMatch[1] : ""
    const simpleColor = simpleColorMap[colorCode] ?? (colorMatch ? colorMatch[2] : colorRaw)

    const materialName = (row["Material Name"] || "").toString().trim()

    lookup[upc] = {
      upc,
      material_number: (row["Material #"] || "").toString().trim(),
      title: materialName,
      brand: "Timberland PRO",
      category_handle: tblCategoryMap[row["Navigation 2"]] || "safety-supplies",
      color: simpleColor === "NO COLOR" ? "" : simpleColor,
      size: (row["Size1"] || "").toString().trim(),
      width: (row["Size2"] || "").toString().trim(),
      wholesale_price: parseFloat(row["Wholesale"]) || 0,
    }
    count++
  }
  console.log(`  Timberland PRO: ${count} UPCs`)
}

// ── Carhartt ────────────────────────────────────────────────────────────
const carharttPath = path.resolve(
  __dirname,
  "../../../storefront/public/S26 UPC List US 2.25.26.xlsx"
)

function carharttCategory(row) {
  // FR flag → flame-resistant
  if (row["FR"] === "Y" || row["FR"] === "Yes" || row["FR"] === true) {
    return "flame-resistant"
  }
  const dept = (row["Department"] || "").toString().toLowerCase()
  const cat = (row["Category"] || "").toString().toLowerCase()
  const subCat = (row["Sub-Category"] || "").toString().toLowerCase()
  const division = (row["Division"] || "").toString().toLowerCase()

  // PPE / Personal Protective → safety-supplies
  if (dept.includes("personal protective") || division.includes("ppe")) {
    return "safety-supplies"
  }
  // Footwear
  if (cat.includes("footwear") || subCat.includes("boot") || subCat.includes("shoe")) {
    return "safety-footwear"
  }
  // Default workwear for Carhartt apparel
  return "work-wear"
}

function parseCarhartt(lookup) {
  if (!fs.existsSync(carharttPath)) {
    console.log("Carhartt file not found, skipping")
    return
  }
  const wb = XLSX.readFile(carharttPath, { cellDates: true })

  let count = 0
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    // Main sheet has headers in row 2 (index 1), not row 1
    // Use raw array mode to detect and handle this
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 })
    // Find the header row (first row containing "UPC")
    let headerIdx = -1
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      if (rawRows[i] && rawRows[i].includes("UPC")) {
        headerIdx = i
        break
      }
    }
    if (headerIdx === -1) {
      console.log(`  Skipping sheet "${sheetName}" (no UPC header found)`)
      continue
    }
    const headers = rawRows[headerIdx]
    const data = rawRows.slice(headerIdx + 1).map((row) => {
      const obj = {}
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i]
      })
      return obj
    })

    for (const row of data) {
      const upc = (row["UPC"] || "").toString().trim()
      if (!upc || upc.length < 8) continue

      const color = (row["Color"] || "").toString().trim()
      const size = (row["Product Size"] || "").toString().trim()
      const dimension = (row["Dimension"] || "").toString().trim()
      const description = (row["Long Description"] || "").toString().trim()
      const material = (row["Material"] || "").toString().trim()

      // Build a clean title from description, fallback to material
      let title = description || material
      // Strip size info from end of description if present
      title = title.replace(/\s*-\s*\d+[A-Z]*\s*$/, "").trim()

      const sizeStr = dimension ? `${size} ${dimension}`.trim() : size

      lookup[upc] = {
        upc,
        material_number: material,
        title,
        brand: "Carhartt",
        category_handle: carharttCategory(row),
        color,
        size: sizeStr,
        width: "",
        wholesale_price: parseFloat(row["List Price"]) || 0,
      }
      count++
    }
  }
  console.log(`  Carhartt: ${count} UPCs`)
}

// ── Main ────────────────────────────────────────────────────────────────
const lookup = {}
parseTimberland(lookup)
parseCarhartt(lookup)

const outPath = path.resolve(__dirname, "../../data/upc-lookup.json")
fs.writeFileSync(outPath, JSON.stringify(lookup, null, 2))
console.log(`Written ${Object.keys(lookup).length} total UPCs to ${outPath}`)
