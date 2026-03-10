import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const xlsxPath = resolve(__dirname, "../../data/KEEN Utility FW25 PRICELIST UPC.xlsx");
const lookupPath = resolve(__dirname, "../../data/upc-lookup.json");

// Read existing lookup
const lookup = JSON.parse(readFileSync(lookupPath, "utf-8"));
const beforeCount = Object.keys(lookup).length;

// Read XLSX
const wb = XLSX.readFile(xlsxPath);

// --- Parse price sheet (F25) to get MSRP, wholesale, category, toe type per style ---
const priceRows = XLSX.utils.sheet_to_json(wb.Sheets["F25"], { header: 1 });
const styleInfo = new Map();

for (const row of priceRows) {
  const styleNum = row[1];
  if (typeof styleNum !== "number") continue;
  const cat = (row[2] || "").toString().trim();
  const styleName = (row[3] || "").toString().trim();
  const wholesale = typeof row[5] === "number" ? row[5] : null;
  const msrp = typeof row[6] === "number" ? row[6] : null;
  const toe = (row[8] || "").toString().trim();

  styleInfo.set(styleNum, {
    styleName,
    cat,
    wholesale,
    msrp,
    toe,
  });
}

// --- Parse UPC sheet ---
const upcRows = XLSX.utils.sheet_to_json(wb.Sheets["UPC"], { header: 1 });
let added = 0;
let skipped = 0;

for (let i = 1; i < upcRows.length; i++) {
  const row = upcRows[i];
  const styleNum = row[0];
  const gender = (row[1] || "").toString().trim();
  const name = (row[2] || "").toString().trim();
  const color = (row[3] || "").toString().trim();
  const size = (row[4] || "").toString().trim();
  const upc = (row[5] || "").toString().trim();

  if (!upc || !name) continue;

  // Skip if already exists
  if (lookup[upc]) {
    skipped++;
    continue;
  }

  const info = styleInfo.get(styleNum) || {};

  // Determine category - Keen Utility is safety footwear
  const categoryHandle = "safety-footwear";

  // Build a clean title from the price sheet name or UPC sheet name
  let title = info.styleName || name;
  // Remove the "-M" or "-W" suffix from UPC sheet names
  title = title.replace(/\s*-[MW]$/, "");

  // Determine width from size field (e.g., "7 D" -> size "7", width "D")
  const sizeMatch = size.match(/^([\d.]+)\s*(.*)$/);
  const sizeVal = sizeMatch ? sizeMatch[1] : size;
  const width = sizeMatch ? sizeMatch[2].trim() : "";

  // Build tags from category and toe type
  const tags = [];
  if (info.cat) tags.push(info.cat);
  if (info.toe === "CF") tags.push("Composite Toe");
  else if (info.toe === "AT") tags.push("Alloy Toe");
  else if (info.toe === "ST") tags.push("Steel Toe");
  if (gender === "MEN") tags.push("Men's");
  else if (gender === "WOMEN") tags.push("Women's");

  // Build description based on toe type
  const toeDesc = info.toe === "CF" ? "CSA-approved composite toe" :
                  info.toe === "AT" ? "CSA-approved alloy toe" :
                  info.toe === "ST" ? "CSA-approved steel toe" :
                  info.toe === "-" ? "Non-safety toe" : "";

  const description = `KEEN Utility ${title}. ${toeDesc ? toeDesc + ". " : ""}${gender === "MEN" ? "Men's" : gender === "WOMEN" ? "Women's" : ""} safety footwear built for comfort and protection.`;

  lookup[upc] = {
    material_number: String(styleNum),
    title,
    brand: "Keen",
    category_handle: categoryHandle,
    color,
    size: sizeVal,
    width,
    wholesale_price: info.wholesale || null,
    map_price: info.msrp || null,
    description,
    features: "",
    care_instructions: "",
    fabric: "",
    fit: "",
    tags,
  };
  added++;
}

// Write updated lookup
writeFileSync(lookupPath, JSON.stringify(lookup, null, 2));

const afterCount = Object.keys(lookup).length;
console.log(`Before: ${beforeCount} UPCs`);
console.log(`Added: ${added} Keen UPCs`);
console.log(`Skipped: ${skipped} (already existed)`);
console.log(`After: ${afterCount} UPCs`);
