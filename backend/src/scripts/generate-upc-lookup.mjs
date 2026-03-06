import XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const xlsxPath = path.resolve(
  __dirname,
  "../../../storefront/public/Copy of 10193767_TBL_ELASTIC_PRO_CA_FTWAPPACC_SP_AO_EN.xlsm"
)

const wb = XLSX.readFile(xlsxPath, { cellDates: true })
const ws = wb.Sheets["UPC List"]
const data = XLSX.utils.sheet_to_json(ws)

const categoryMap = {
  Footwear: "safety-footwear",
  Apparel: "work-wear",
  Accessories: "safety-supplies",
}

// Map distributor color descriptions to simple English names
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

const lookup = {}
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
    brand: (row["Navigation 1"] || "").toString().trim(),
    category_handle: categoryMap[row["Navigation 2"]] || "safety-supplies",
    color: simpleColor === "NO COLOR" ? "" : simpleColor,
    size: (row["Size1"] || "").toString().trim(),
    width: (row["Size2"] || "").toString().trim(),
    wholesale_price: parseFloat(row["Wholesale"]) || 0,
  }
}

const outPath = path.resolve(__dirname, "../../data/upc-lookup.json")
fs.writeFileSync(outPath, JSON.stringify(lookup, null, 2))
console.log(`Written ${Object.keys(lookup).length} UPCs to ${outPath}`)
