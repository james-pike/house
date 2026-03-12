#!/usr/bin/env node
/**
 * Download Carhartt bib product images from the vault.
 * Saves JPGs locally to backend/data/vault-images/ for later R2 upload.
 */

import fs from "fs"
import path from "path"

const VAULT_BASE = "https://carhartt-vault.esko-saas.com"
const VAULT_SESSION = "last_login_group=36; JSESSIONID=A01F4459225937B74D7463F29F2DC2B1"
const VAULT_XSRF = "4D4363FD5CD787541C4C125A7058A585"
const DOWNLOAD_DIR = "backend/data/vault-images"
const DELAY_MS = 500
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// All Carhartt bib style numbers
const BIB_STYLES = [
  "101626", "101627", "102691", "102776", "102987",
  "103042", "104031", "104049", "104672", "104674",
  "106001", "106235", "106671", "106672", "107619",
]

async function vaultSearch(query) {
  const body = {
    jsonrpc: "2.0",
    method: "getPage",
    params: [
      { columns: 1, confict: "SEARCH", countTotal: false, facetsConfig: {}, graph: false, isMetrics: false, notUseCache: false, orderBy: "date_entered", orderByDirection: "DESC", pageNumber: 0, retrieveMetadata: true, rows: 200, timeStamp: Date.now().toString() },
      null,
      { _type_: "jb.gwt_main_modules.base_widgets.client.searches.GwtBooleanCriterion", mandatorySearch: false, conjunction: "OR", criteria: [
        { _type_: "jb.gwt_main_modules.base_widgets.client.searches.GwtQuickSearchCriterion", mandatorySearch: false, fieldsToSearch: [], search: query, synonymsDictionaries: [-1], useAccentInsensitive: false, useDictionaries: true, useSynonyms: true, useTermsBySynonyms: false, useThesaurus: false },
        { _type_: "jb.gwt_main_modules.base_widgets.client.searches.GwtFieldCriterion", mandatorySearch: false, condition: "3", field: "record_id", value: query },
      ], endToken: "end" }
    ],
    id: 1,
    xsrfKey: VAULT_XSRF,
  }

  const res = await fetch(`${VAULT_BASE}/v1/Search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: VAULT_SESSION },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Vault search failed: ${res.status}`)
  const text = await res.text()
  if (text.startsWith("<")) throw new Error("Session expired")
  const json = JSON.parse(text)
  if (json.error) throw new Error(`Vault error: ${json.error.message}`)
  return json.result
}

async function vaultDownloadHighRes(secureRecordId) {
  const url = `${VAULT_BASE}/servlet/jb.view?table=high&col=high&id=${secureRecordId}`
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(url, {
      headers: { Cookie: VAULT_SESSION, Accept: "image/*" },
    })
    if (res.status === 202) { await sleep(2000); continue }
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length > 5000) return buffer
    await sleep(2000)
  }
  throw new Error(`Download timed out for ${secureRecordId}`)
}

function parseAndGroupAssets(result) {
  const byColor = new Map()
  if (!result || !result.imageData) return byColor
  for (const item of result.imageData) {
    const f = item.fields || {}
    const colorCode = f["http://ns.Carhartt.com/ Color_Code"] || ""
    const fileType = (f.file_type2 || "").toUpperCase()
    if (fileType === "MOV" || fileType === "MP4" || fileType === "AVI" || fileType === "PDF") continue
    if (!colorCode) continue
    const asset = {
      recordId: f.record_id,
      secureRecordId: f.secure_record_id,
      fileName: f.file_name,
      colorCode,
      colorName: f["http://ns.Carhartt.com/ Color_Name"] || "",
      view: f["http://ns.Carhartt.com/ View"] || "",
      background: f["http://ns.Carhartt.com/ Background"] || "",
      assetType: f["http://ns.Carhartt.com/ Asset_Type"] || "",
    }
    if (!byColor.has(colorCode)) byColor.set(colorCode, [])
    byColor.get(colorCode).push(asset)
  }
  // Sort: Front + White first
  for (const [, assets] of byColor) {
    assets.sort((a, b) => {
      const score = (x) =>
        (x.view === "Front" ? 10 : 0) +
        (x.background === "White" ? 5 : 0) +
        (x.assetType?.includes("Product") ? 2 : 0)
      return score(b) - score(a)
    })
  }
  return byColor
}

// ── Main ──
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })

let totalDownloaded = 0
let totalSkipped = 0

for (const style of BIB_STYLES) {
  console.log(`\n── ${style}`)

  // Check which colors we already have locally
  const existing = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith(style + "_") && f.endsWith(".jpg"))
  if (existing.length > 0) {
    console.log(`  Already have ${existing.length} local images: ${existing.join(", ")}`)
  }

  try {
    const result = await vaultSearch(style)
    const assetsByColor = parseAndGroupAssets(result)

    if (assetsByColor.size === 0) {
      console.log("  No image assets found in vault")
      await sleep(DELAY_MS)
      continue
    }

    const colorCodes = [...assetsByColor.keys()]
    console.log(`  Vault has ${colorCodes.length} colors: ${colorCodes.join(", ")}`)

    for (const [colorCode, assets] of assetsByColor) {
      const localPath = path.join(DOWNLOAD_DIR, `${style}_${colorCode}.jpg`)
      if (fs.existsSync(localPath)) {
        console.log(`  ${colorCode}: already downloaded, skipping`)
        totalSkipped++
        continue
      }

      const best = assets[0]
      console.log(`  ${colorCode} (${best.colorName || "?"}): ${best.fileName} [${best.view || "?"}, ${best.background || "?"}]`)

      try {
        const jpgBuffer = await vaultDownloadHighRes(best.secureRecordId)
        fs.writeFileSync(localPath, jpgBuffer)
        totalDownloaded++
        console.log(`    -> ${(jpgBuffer.length / 1024).toFixed(0)} KB saved`)
      } catch (err) {
        console.log(`    -> SKIP: ${err.message}`)
      }

      await sleep(DELAY_MS)
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`)
  }

  await sleep(DELAY_MS)
}

console.log(`\n── Done: ${totalDownloaded} downloaded, ${totalSkipped} skipped (already had) ──`)
