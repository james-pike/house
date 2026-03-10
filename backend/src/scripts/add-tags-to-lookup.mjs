import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const lookupPath = resolve(__dirname, "../../data/upc-lookup.json");
const lookup = JSON.parse(readFileSync(lookupPath, "utf-8"));

let updated = 0;

for (const [upc, entry] of Object.entries(lookup)) {
  // Skip Keen — already has tags from import
  if (entry.brand === "Keen") continue;

  const tags = [];

  // --- Carhartt ---
  if (entry.brand === "Carhartt") {
    if (entry.category_handle === "flame-resistant") tags.push("FR Rated");
    if (entry.fit) tags.push(entry.fit);
    // Extract key features
    const feat = (entry.features || "").toLowerCase();
    if (feat.includes("waterproof") || feat.includes("water repel")) tags.push("Waterproof");
    if (feat.includes("insulated") || feat.includes("insulation")) tags.push("Insulated");
    if (feat.includes("fastdry") || feat.includes("fast dry")) tags.push("FastDry");
    if (feat.includes("rugged flex")) tags.push("Rugged Flex");
    if (feat.includes("rain defender")) tags.push("Rain Defender");
    if (feat.includes("wind fighter")) tags.push("Wind Fighter");
    if (feat.includes("storm defender")) tags.push("Storm Defender");
    if (feat.includes("force")) tags.push("Force");
    if (entry.category_handle === "safety-supplies") tags.push("Safety Supplies");
  }

  // --- Timberland PRO ---
  if (entry.brand === "Timberland PRO") {
    const title = (entry.title || "").toLowerCase();
    const feat = (entry.features || entry.description || "").toLowerCase();
    if (title.includes("ct") || feat.includes("composite toe") || feat.includes("composite safety toe")) tags.push("Composite Toe");
    else if (title.includes("st") || feat.includes("steel toe") || feat.includes("steel safety toe")) tags.push("Steel Toe");
    else if (title.includes("at") || feat.includes("alloy toe")) tags.push("Alloy Toe");
    if (feat.includes("waterproof") || title.includes("wp")) tags.push("Waterproof");
    if (feat.includes("anti-fatigue")) tags.push("Anti-Fatigue");
    if (feat.includes("electrical hazard") || title.includes("esr") || title.includes("eh")) tags.push("EH Rated");
    if (feat.includes("csa")) tags.push("CSA Approved");
  }

  // --- Blundstone ---
  if (entry.brand === "Blundstone") {
    const title = (entry.title || "").toLowerCase();
    if (title.includes("csa")) tags.push("CSA Approved");
    if (title.includes("steel toe") || title.includes("st")) tags.push("Steel Toe");
    if (title.includes("composite")) tags.push("Composite Toe");
    if (title.includes("waterproof") || title.includes("wp")) tags.push("Waterproof");
    if (title.includes("insulated")) tags.push("Insulated");
    if (entry.category_handle === "safety-footwear") tags.push("Safety Footwear");
  }

  // --- Redback ---
  if (entry.brand === "Redback") {
    const title = (entry.title || "").toLowerCase();
    if (title.includes("steel toe") || title.includes("st")) tags.push("Steel Toe");
    if (title.includes("composite")) tags.push("Composite Toe");
    if (entry.category_handle === "safety-footwear") tags.push("Safety Footwear");
  }

  if (tags.length > 0) {
    // Deduplicate
    entry.tags = [...new Set(tags)];
    updated++;
  }
}

writeFileSync(lookupPath, JSON.stringify(lookup, null, 2));

console.log(`Updated ${updated} entries with tags`);
console.log("\nSample tags by brand:");
for (const brand of ["Carhartt", "Timberland PRO", "Blundstone", "Redback"]) {
  const entries = Object.values(lookup).filter(v => v.brand === brand && v.tags);
  const tagCounts = {};
  entries.forEach(e => (e.tags || []).forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
  console.log(`\n${brand} (${entries.length} tagged):`);
  Object.entries(tagCounts).sort((a,b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));
}
