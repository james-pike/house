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

const lookup = {}
for (const row of data) {
  const upc = (row["UPC Code"] || "").toString().trim()
  if (!upc) continue

  const colorRaw = (row["Color"] || "").toString().trim()
  const colorMatch = colorRaw.match(/^\(([^)]+)\)\s*(.*)$/)
  const colorCode = colorMatch ? colorMatch[1] : ""
  const colorName = colorMatch ? colorMatch[2] : colorRaw

  const materialName = (row["Material Name"] || "").toString().trim()
  const nav4 = (row["Navigation 4"] || "").toString().trim()

  lookup[upc] = {
    upc,
    material_number: (row["Material #"] || "").toString().trim(),
    title: materialName,
    brand: (row["Navigation 1"] || "").toString().trim(),
    department: (row["Navigation 2"] || "").toString().trim(),
    gender: (row["Navigation 3"] || "").toString().trim(),
    subcategory: nav4,
    category_handle: categoryMap[row["Navigation 2"]] || "safety-supplies",
    color_code: colorCode,
    color_name: colorName === "NO COLOR" ? "" : colorName,
    size: (row["Size1"] || "").toString().trim(),
    width: (row["Size2"] || "").toString().trim(),
    size_scale: (row["Size Scale"] || "").toString().trim(),
    wholesale_price: parseFloat(row["Wholesale"]) || 0,
  }
}

const outPath = path.resolve(__dirname, "../../data/upc-lookup.json")
fs.writeFileSync(outPath, JSON.stringify(lookup, null, 2))
console.log(`Written ${Object.keys(lookup).length} UPCs to ${outPath}`)
