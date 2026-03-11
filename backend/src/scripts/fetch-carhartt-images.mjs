#!/usr/bin/env node
/**
 * Fetch Carhartt product images from the vault (MediaBeacon/Esko DAM),
 * convert to WebP, upload to Cloudflare R2, and attach to Medusa products.
 *
 * For each Carhartt product in Medusa, searches the vault for ALL available
 * color variant images (not just the ones we have in UPC data) and attaches
 * them all at once to avoid race conditions.
 *
 * Usage:
 *   R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx node backend/src/scripts/fetch-carhartt-images.mjs
 *
 * Requires active vault session — update VAULT_SESSION and VAULT_XSRF below.
 */

import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// ── Vault session (update before each run) ──
const VAULT_BASE = "https://carhartt-vault.esko-saas.com";
const VAULT_SESSION = "last_login_group=36; JSESSIONID=33613AAAAD27A3BF5CBBEE2B4018EF1F";
const VAULT_XSRF = "16244FFD7EFDE86C2A996509587E48B4";

// ── Cloudflare R2 ──
const R2_ACCOUNT_ID = "d3d227d74f04b6b9762fe5f6585fa7f8";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = "product-images";
const R2_PUBLIC_URL = "https://pub-8a2192b4a4e14435b4cc7037de30a086.r2.dev";

// ── Medusa ──
const MEDUSA_URL = "https://house-qvr4.onrender.com";
const ADMIN_EMAIL = "admin@safetyhouse.ca";
const ADMIN_PASS = "inventory";

// ── Config ──
const LIMIT = 20; // Only process this many styles (0 = all)
const DOWNLOAD_DIR = path.resolve("backend/data/vault-images");
const DELAY_MS = 500; // delay between vault requests

// ── Helpers ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Search the vault for assets matching a style number.
 */
async function vaultSearch(query) {
  const body = {
    jsonrpc: "2.0",
    method: "getPage",
    params: [
      {
        columns: 1,
        confict: "SEARCH",
        countTotal: false,
        facetsConfig: {},
        graph: false,
        isMetrics: false,
        notUseCache: false,
        orderBy: "date_entered",
        orderByDirection: "DESC",
        pageNumber: 0,
        retrieveMetadata: true,
        rows: 200, // get more results to cover all colors
        timeStamp: Date.now().toString(),
      },
      null,
      {
        _type_: "jb.gwt_main_modules.base_widgets.client.searches.GwtBooleanCriterion",
        mandatorySearch: false,
        conjunction: "OR",
        criteria: [
          {
            _type_: "jb.gwt_main_modules.base_widgets.client.searches.GwtQuickSearchCriterion",
            mandatorySearch: false,
            fieldsToSearch: [],
            search: query,
            synonymsDictionaries: [-1],
            useAccentInsensitive: false,
            useDictionaries: true,
            useSynonyms: true,
            useTermsBySynonyms: false,
            useThesaurus: false,
          },
          {
            _type_: "jb.gwt_main_modules.base_widgets.client.searches.GwtFieldCriterion",
            mandatorySearch: false,
            condition: "3",
            field: "record_id",
            value: query,
          },
        ],
        endToken: "end",
      },
    ],
    id: 1,
    xsrfKey: VAULT_XSRF,
  };

  const res = await fetch(`${VAULT_BASE}/v1/Search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: VAULT_SESSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Vault search failed: ${res.status}`);
  const text = await res.text();
  if (text.startsWith("<")) throw new Error("Session expired");
  const json = JSON.parse(text);
  if (json.error) throw new Error(`Vault error: ${json.error.message}`);
  return json.result;
}

/**
 * Download a high-res preview image from the vault.
 * Retries on 202 (processing).
 */
async function vaultDownloadHighRes(secureRecordId) {
  const url = `${VAULT_BASE}/servlet/jb.view?table=high&col=high&id=${secureRecordId}`;

  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(url, {
      headers: { Cookie: VAULT_SESSION, Accept: "image/*" },
    });

    if (res.status === 202) {
      await sleep(2000);
      continue;
    }

    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 5000) return buffer;

    await sleep(2000);
  }

  throw new Error(`Download timed out for ${secureRecordId}`);
}

/**
 * Parse vault search results into assets grouped by color code.
 * Returns Map<colorCode, asset[]> with best image first per color.
 */
function parseAndGroupAssets(result) {
  const byColor = new Map(); // colorCode -> assets[]
  if (!result || !result.imageData) return byColor;

  for (const item of result.imageData) {
    const f = item.fields || {};
    const colorCode = f["http://ns.Carhartt.com/ Color_Code"] || "";
    const fileType = (f.file_type2 || "").toUpperCase();

    // Skip non-image files (videos, etc.)
    if (fileType === "MOV" || fileType === "MP4" || fileType === "AVI") continue;
    if (!colorCode) continue;

    const asset = {
      recordId: f.record_id,
      secureRecordId: f.secure_record_id,
      fileName: f.file_name,
      colorCode,
      colorName: f["http://ns.Carhartt.com/ Color_Name"] || "",
      view: f["http://ns.Carhartt.com/ View"] || "",
      background: f["http://ns.Carhartt.com/ Background"] || "",
      assetType: f["http://ns.Carhartt.com/ Asset_Type"] || "",
    };

    if (!byColor.has(colorCode)) byColor.set(colorCode, []);
    byColor.get(colorCode).push(asset);
  }

  // Sort each color's assets: Front + White first
  for (const [, assets] of byColor) {
    assets.sort((a, b) => {
      const score = (x) =>
        (x.view === "Front" ? 10 : 0) +
        (x.background === "White" ? 5 : 0) +
        (x.assetType?.includes("Product") ? 2 : 0);
      return score(b) - score(a);
    });
  }

  return byColor;
}

function initR2() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.warn("R2 credentials not set — will save locally only.");
    return null;
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

async function uploadToR2(s3, key, webpBuffer) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

async function medusaLogin() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const data = await res.json();
  return data.token;
}

async function getCarharttProducts(token) {
  let products = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await fetch(
      `${MEDUSA_URL}/admin/products?limit=${limit}&offset=${offset}&expand=variants,images`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!data.products || data.products.length === 0) break;
    products.push(...data.products);
    if (data.products.length < limit) break;
    offset += limit;
  }
  return products.filter(
    (p) =>
      p.metadata?.brand === "Carhartt" ||
      p.title?.toLowerCase().includes("carhartt")
  );
}

/**
 * Set ALL images on a product in one call (no race condition).
 * Merges with existing non-R2 images.
 */
async function setProductImages(token, productId, newImageUrls) {
  const getRes = await fetch(`${MEDUSA_URL}/admin/products/${productId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { product } = await getRes.json();
  const existingUrls = (product.images || [])
    .map((img) => img.url)
    .filter((url) => !url.includes("r2.dev/carhartt/")); // keep non-vault images

  const allUrls = [...new Set([...existingUrls, ...newImageUrls])];
  const images = allUrls.map((url) => ({ url }));

  const res = await fetch(`${MEDUSA_URL}/admin/products/${productId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ images }),
  });

  return res.ok;
}

// ── Main ──
async function main() {
  // 1. Load UPC data
  const upcData = JSON.parse(
    fs.readFileSync("backend/data/upc-lookup.json", "utf8")
  );
  const entries = Array.isArray(upcData) ? upcData : Object.values(upcData);
  const carhartt = entries.filter((e) => e.brand === "Carhartt");

  // Build style -> color codes from UPC data + color code -> color name mapping
  const styleMap = new Map();
  const colorCodeToName = new Map(); // e.g., "DKB" -> "Dark Brown"
  for (const e of carhartt) {
    const parts = e.material_number.split("-");
    const style = parts[0];
    const colorCode = parts.slice(1).join("-");
    if (!styleMap.has(style)) styleMap.set(style, new Set());
    styleMap.get(style).add(colorCode);
    if (colorCode && e.color) {
      colorCodeToName.set(colorCode.toUpperCase(), e.color);
    }
  }
  console.log(`Color code mappings: ${colorCodeToName.size}`);

  // 2. Setup
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const s3 = initR2();

  let token;
  try {
    token = await medusaLogin();
    console.log("Logged into Medusa\n");
  } catch {
    console.warn("Could not log into Medusa — will skip product attachment\n");
  }

  // 3. Get Carhartt products from Medusa and map to styles
  let products = [];
  if (token) {
    products = await getCarharttProducts(token);
    console.log(`Found ${products.length} Carhartt products in Medusa\n`);
  }

  // Build barcode -> material_number lookup
  const barcodeToMaterial = new Map();
  for (const e of carhartt) {
    if (e.upc) barcodeToMaterial.set(e.upc, e.material_number);
  }

  // Map style -> Medusa product via variant barcodes
  const styleToProduct = new Map();
  for (const p of products) {
    for (const v of p.variants || []) {
      const barcode = v.sku || v.barcode;
      if (!barcode) continue;
      const material = barcodeToMaterial.get(barcode);
      if (material) {
        const style = material.split("-")[0];
        if (!styleToProduct.has(style)) {
          styleToProduct.set(style, p);
        }
      }
    }
  }

  const stylesToProcess = [...styleToProduct.keys()];
  const limited = LIMIT > 0 ? stylesToProcess.slice(0, LIMIT) : stylesToProcess;
  console.log(`Mapped ${styleToProduct.size} styles to Medusa products`);
  console.log(`Processing ${limited.length} styles\n`);

  let totalDownloaded = 0;
  let totalUploaded = 0;
  let totalAttached = 0;

  for (const style of limited) {
    const product = styleToProduct.get(style);
    console.log(`\n── ${style} -> "${product.title}"`);

    try {
      // Search vault for ALL images of this style
      const result = await vaultSearch(style);
      const assetsByColor = parseAndGroupAssets(result);

      if (assetsByColor.size === 0) {
        console.log("  No image assets found in vault");
        await sleep(DELAY_MS);
        continue;
      }

      const colorCodes = [...assetsByColor.keys()];
      console.log(`  Vault has ${colorCodes.length} colors: ${colorCodes.join(", ")}`);

      // Download + upload best image for each color
      const imageUrls = [];
      const colorImages = {}; // color name -> R2 URL (for metadata)

      for (const [colorCode, assets] of assetsByColor) {
        const best = assets[0]; // already sorted: Front+White first
        // Resolve color name: vault metadata > UPC lookup > code itself
        const colorName =
          best.colorName ||
          colorCodeToName.get(colorCode.toUpperCase()) ||
          colorCode;

        console.log(`  ${colorCode} (${colorName}): ${best.fileName} [${best.view || "?"}, ${best.background || "?"}]`);

        try {
          // Download high-res
          const jpgBuffer = await vaultDownloadHighRes(best.secureRecordId);
          const jpgPath = path.join(DOWNLOAD_DIR, `${style}_${colorCode}.jpg`);
          fs.writeFileSync(jpgPath, jpgBuffer);
          totalDownloaded++;

          // Convert to WebP
          const webpBuffer = await sharp(jpgBuffer)
            .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();

          const r2Key = `carhartt/${style}/${style}_${colorCode}.webp`;

          if (s3) {
            const url = await uploadToR2(s3, r2Key, webpBuffer);
            imageUrls.push(url);
            colorImages[colorName] = url;
            totalUploaded++;
            console.log(`    -> ${(webpBuffer.length / 1024).toFixed(0)} KB uploaded`);
          } else {
            const webpPath = path.join(DOWNLOAD_DIR, `${style}_${colorCode}.webp`);
            fs.writeFileSync(webpPath, webpBuffer);
            console.log(`    -> saved locally`);
          }
        } catch (err) {
          console.log(`    -> SKIP: ${err.message}`);
        }

        await sleep(DELAY_MS);
      }

      // Attach ALL images to product + save color_images metadata in one go
      if (token && imageUrls.length > 0) {
        const ok = await setProductImages(token, product.id, imageUrls);
        if (ok) {
          console.log(`  Attached ${imageUrls.length} images to "${product.title}"`);
          totalAttached += imageUrls.length;

          // Save color_images mapping to product metadata
          const metaRes = await fetch(`${MEDUSA_URL}/admin/products/${product.id}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              metadata: {
                ...product.metadata,
                color_images: colorImages,
              },
            }),
          });
          if (metaRes.ok) {
            console.log(`  Saved color_images metadata (${Object.keys(colorImages).length} colors)`);
          }
        } else {
          console.log(`  FAILED to attach images`);
        }
        await sleep(800); // extra delay for Medusa
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n── Done ──`);
  console.log(`Downloaded: ${totalDownloaded}`);
  console.log(`Uploaded:   ${totalUploaded}`);
  console.log(`Attached:   ${totalAttached}`);
  console.log(`Products:   ${limited.length}`);
}

main().catch(console.error);
