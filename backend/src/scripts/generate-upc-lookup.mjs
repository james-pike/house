import XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Timberland PRO ──────────────────────────────────────────────────────
const tblPath = path.resolve(
  __dirname,
  "../../../pos/public/Copy of 10193767_TBL_ELASTIC_PRO_CA_FTWAPPACC_SP_AO_EN.xlsm"
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
const carharttPaths = [
  path.resolve(__dirname, "../../../pos/public/S26 UPC List US 2.25.26.xlsx"),
  path.resolve(__dirname, "../../../pos/public/carhartt.xlsx"),
]

function carharttCategory(row) {
  if (row["FR"] === "Y" || row["FR"] === "Yes" || row["FR"] === true) {
    return "flame-resistant"
  }
  const cat = (row["Category"] || "").toString().toLowerCase()
  const subCat = (row["Sub-Category"] || "").toString().toLowerCase()

  if (cat.includes("footwear") || subCat.includes("boot") || subCat.includes("shoe")) {
    return "safety-footwear"
  }
  if (cat.includes("accessories")) {
    return "safety-supplies"
  }
  return "work-wear"
}

function parseCarharttFile(filePath, lookup) {
  if (!fs.existsSync(filePath)) {
    console.log(`  Carhartt file not found: ${path.basename(filePath)}, skipping`)
    return 0
  }
  const wb = XLSX.readFile(filePath, { cellDates: true })

  let count = 0
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 })
    let headerIdx = -1
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      if (rawRows[i] && rawRows[i].includes("UPC")) {
        headerIdx = i
        break
      }
    }
    if (headerIdx === -1) {
      console.log(`    Skipping sheet "${sheetName}" (no UPC header found)`)
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

      let title = description || material
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
        map_price: parseFloat(row["MAP"]) || 0,
        description: (row["ConsumerCopyPoints"] || "").toString().trim(),
        features: (row["RetailCopyPoints"] || "").toString().trim(),
        care_instructions: (row["CareInstructions"] || "").toString().trim(),
        fabric: (row["Fabric Content"] || "").toString().trim(),
        fit: (row["Fit Length"] || "").toString().trim(),
      }
      count++
    }
  }
  return count
}

function parseCarhartt(lookup) {
  let total = 0
  for (const filePath of carharttPaths) {
    const count = parseCarharttFile(filePath, lookup)
    if (count > 0) console.log(`  Carhartt (${path.basename(filePath)}): ${count} UPCs`)
    total += count
  }
  if (total === 0) console.log("  Carhartt: no files found")
}

// ── Blundstone ──────────────────────────────────────────────────────────
const blundstonePath = path.resolve(
  __dirname,
  "../../../pos/public/Blundstone.xlsx"
)

function parseBlundstone(lookup) {
  if (!fs.existsSync(blundstonePath)) {
    console.log("Blundstone file not found, skipping")
    return
  }
  const wb = XLSX.readFile(blundstonePath, { cellDates: true })
  const ws = wb.Sheets["SKU Details"]
  if (!ws) {
    console.log("  Blundstone: 'SKU Details' sheet not found, skipping")
    return
  }
  const data = XLSX.utils.sheet_to_json(ws)

  let count = 0
  for (const row of data) {
    const ean13 = (row["Barcode EAN13"] || "").toString().trim()
    const ean14 = (row["Barcode EAN14"] || "").toString().trim()
    if (!ean13) continue

    const itemNumber = (row["Item Number"] || "").toString().trim()
    const productName = (row["Product Name"] || "").toString().trim()
    const colour = (row["Colour"] || "").toString().trim()
    const size = (row["Real Size Code"] || "").toString().trim()

    const entry = {
      upc: ean13,
      material_number: itemNumber,
      title: `Blundstone ${itemNumber} ${productName}`,
      brand: "Blundstone",
      category_handle: "safety-footwear",
      color: colour.charAt(0).toUpperCase() + colour.slice(1).toLowerCase(),
      size,
      width: "",
      wholesale_price: 0,
    }

    lookup[ean13] = entry
    // Also index by EAN14 so both barcode formats work when scanned
    if (ean14) {
      lookup[ean14] = { ...entry, upc: ean14 }
    }
    count++
  }
  console.log(`  Blundstone: ${count} UPCs`)
}

// ── Redback ─────────────────────────────────────────────────────────────
const redbackPath = path.resolve(
  __dirname,
  "../../../pos/public/REDBACK MASTER UPC CANADA CODES 2026.xlsx"
)

function parseRedback(lookup) {
  if (!fs.existsSync(redbackPath)) {
    console.log("Redback file not found, skipping")
    return
  }
  const wb = XLSX.readFile(redbackPath, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 })

  // Row 0 is headers: Style Name, Style code, colour, Aussie Size, UPC, wholesale, retail
  // Some rows are section headers (only first cell filled, e.g. "BOBCAT SOFT TOE SERIES")
  let count = 0
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    if (!row || row.length < 5) continue

    const styleName = (row[0] || "").toString().trim()
    const styleCode = (row[1] || "").toString().trim()
    const colour = (row[2] || "").toString().trim()
    const size = (row[3] !== undefined && row[3] !== null) ? row[3].toString().trim() : ""
    const upc = (row[4] || "").toString().trim()
    const wholesale = parseFloat(row[5]) || 0
    const retail = parseFloat(row[6]) || 0

    // Skip section header rows (no style code or no UPC)
    if (!styleCode || !upc || upc.length < 8) continue

    lookup[upc] = {
      upc,
      material_number: styleCode,
      title: `Redback ${styleName} (${styleCode})`,
      brand: "Redback",
      category_handle: "safety-footwear",
      color: colour,
      size,
      width: "",
      wholesale_price: wholesale,
      map_price: retail,
    }
    count++
  }
  console.log(`  Redback: ${count} UPCs`)
}

// ── Main ────────────────────────────────────────────────────────────────
const lookup = {}
parseTimberland(lookup)
parseCarhartt(lookup)
parseBlundstone(lookup)
parseRedback(lookup)

const outPath = path.resolve(__dirname, "../../data/upc-lookup.json")
fs.writeFileSync(outPath, JSON.stringify(lookup, null, 2))
console.log(`Written ${Object.keys(lookup).length} total UPCs to ${outPath}`)
