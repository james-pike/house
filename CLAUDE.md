# The Safety House — Monorepo

Ottawa-based safety/workwear retailer. Monorepo with three apps sharing one Medusa v2 backend.

## Project Structure

```
house/
├── backend/          Medusa v2 commerce backend (Node.js/TypeScript)
├── frontend/         Customer-facing Qwik storefront (Cloudflare Pages)
├── pos/              Internal POS/inventory app (Qwik, Vercel Edge)
└── package.json      Root workspace (xlsx dependency for UPC imports)
```

## Infrastructure

| Service          | Provider         | Plan                    | URL/Notes                                    |
|------------------|------------------|-------------------------|----------------------------------------------|
| Backend API      | Render           | Free (cold starts)      | https://house-qvr4.onrender.com              |
| Database         | Render Postgres  | Starter ($7/mo)         | Internal connection from backend              |
| Frontend         | Cloudflare Pages | Free                    | https://house-6ml.pages.dev                  |
| POS              | Vercel Edge      | Free                    | Internal tool                                |
| Images           | Cloudflare R2    | Planned                 | Not yet set up                               |
| Analytics        | Cloudflare       | Free                    | Token via VITE_CF_ANALYTICS_TOKEN            |

## Environment Variables

### Backend (Render)
- `DATABASE_URL` — Render Postgres internal connection string
- `STORE_CORS` — Allowed storefront origins (comma-separated)
- `ADMIN_CORS` — Allowed admin/POS origins
- `AUTH_CORS` — Allowed auth origins
- `JWT_SECRET`, `COOKIE_SECRET`

### Frontend (Cloudflare Pages)
**IMPORTANT:** `VITE_*` vars must be set in Cloudflare Pages dashboard as build-time env vars. `wrangler.toml [vars]` are runtime only and won't be available during SSG/SSR build.
- `VITE_MEDUSA_BACKEND_URL` — Backend API URL
- `VITE_MEDUSA_PUBLISHABLE_KEY` — Medusa store API key
- `VITE_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token (planned)

## Tech Stack

### Frontend
- **Qwik 1.19** + QwikCity + Qwik UI headless components
- **Vite 5.x** (Vite 7 breaks Qwik Cloudflare edge adapter — manualChunks conflict)
- **Tailwind CSS 3.4** with custom theme (`primary: #e6a817`, `dark: #1b1b1b`)
- Cloudflare Pages adapter in `frontend/adapters/cloudflare-pages/`

### Backend
- **Medusa v2 (2.13.1)** with custom POS module
- Custom API routes under `backend/src/api/admin/pos/`
- POS module with sessions, receive logs, inventory management

### POS
- **Qwik 1.19** + Vite 7.x + Vercel Edge
- **Tailwind CSS 4.x** (newer than frontend)
- Barcode scanning via html5-qrcode

## Key Architecture Patterns

### Caching (frontend/src/lib/medusa.ts)
- **5-minute in-memory cache** on the server — avoids hitting Render on every nav
- **Cache warming** on first request — prefetches all collection pages in parallel
- **Per-handle cache seeding** — when a collection loads, each product gets cached individually so product detail pages are instant
- **Cloudflare edge caching** — `s-maxage=300, stale-while-revalidate=3600`
- Collection products are **fully paginated** (batches of 100) to support 200+ products per category

### Layout (frontend/src/routes/layout.tsx)
- Header measures its own height → sets `--header-h` CSS variable
- Sticky elements use `top-[var(--header-h)]`
- All `vh` units removed on mobile — use fixed px/clamp values to avoid scroll jitter
- Active nav highlights persist on product pages via `?collection=` query param
- Stripe pattern on active nav uses radial gradient CSS mask

### Products
- Desktop: clicking a product card navigates directly to `/product/[handle]/`
- Mobile: opens quick view modal with HTML prefetch of the product page
- Variant sizes filtered by selected color; color names stripped from size labels
- Tags/badges displayed from product metadata on detail page

## CSS Conventions
- Use Tailwind utility classes, avoid custom CSS except in `global.css`
- Stripe pattern SVG data URIs used for active nav, promo banners, footer texture
- Dark mode via `.dark` class on `<html>`, toggled in footer
- Never use emojis in code or UI unless user explicitly requests it

## Git & Deployment
- **Frontend auto-deploys** on push to master via Cloudflare Pages
- **Backend auto-deploys** on push to master via Render (if pipeline minutes available)
- Render free tier has limited pipeline minutes — may need to push a trivial change to trigger redeploy
- ESLint runs during Cloudflare build — fix lint errors before pushing or build will fail
- Commit messages should be concise and descriptive

---

# UPC Import Pipeline

## Overview

Products are cataloged via UPC/barcode data from supplier spreadsheets. The pipeline:

1. **Import** — Parse supplier XLSX → write to `backend/data/upc-lookup.json`
2. **Enrich** — Add smart tags and auto-generated descriptions
3. **Seed** — Push products to Medusa database via API
4. **Backfill** — Update existing products with new tags/descriptions

## Standard Fields in upc-lookup.json

Every UPC entry should have these fields (set to empty string or 0 if not available):

```json
{
  "upc": "012345678901",
  "material_number": "STYLE-123",
  "title": "Product Name",
  "brand": "Brand Name",
  "category_handle": "safety-footwear",
  "color": "Black",
  "size": "10",
  "width": "EE",
  "wholesale_price": 85.00,
  "map_price": 169.99
}
```

**Optional rich fields** (backfilled to product metadata):
- `description` — Product description sentence (Carhartt supplies these; others are auto-generated)
- `features` — Feature bullet points (Carhartt: RetailCopyPoints)
- `care_instructions` — Care/wash instructions (Carhartt: CareInstructions)
- `fabric` — Fabric/material content
- `fit` — Fit type (e.g., "Relaxed Fit", "Loose Fit")
- `origin` — Country of origin
- `tags` — Array of smart tags (auto-generated by enrichment)

### Data Normalization Rules (CRITICAL)

These rules ensure consistent product display across all brands. Carhartt is the reference standard.

**1. Title must NOT contain color.** The `title` field should be the clean product name only (e.g., "CSA Skokie Mid WP"), never with color appended (e.g., NOT "CSA Skokie Mid WP - Dark Earth/Black"). Color belongs exclusively in the `color` field. Some suppliers (like Keen) embed color in their title — the enrichment script (`enrich-upc-lookup.mjs`) automatically strips trailing ` - Color` from titles when it matches the `color` field.

**2. Seed scripts must NOT append color to title.** The receive endpoint (`/admin/pos/receive/new-product`) handles color as a separate variant attribute. It creates proper Color and Size options on the product. Never build a title like `` `${title} - ${color}` `` — just pass the clean title.

**3. Color and Size must be separate fields.** Every UPC entry must have `color` and `size` as distinct fields. The receive endpoint creates separate "Color" and "Size" options on the Medusa product. Variant titles are built as `"Color / Size"` (e.g., "Dark Earth/Black / 10"). The frontend strips color from variant labels to show size-only buttons, filtered by the selected color swatch.

**4. When writing new import scripts:** Always verify the output titles are clean by spot-checking a few entries. If the supplier's title column includes color, strip it during import or let enrichment handle it. Check that `color` and `size` fields are populated separately — never combined into one field.

**Category handles:** `work-wear`, `safety-footwear`, `safety-supplies`, `flame-resistant`, `casual-wear`

## Category IDs (Medusa)

| Handle           | Category ID                           |
|------------------|---------------------------------------|
| work-wear        | pcat_01KK58WFQTYD6BSH0KZGB810JG      |
| safety-footwear  | pcat_01KK58WFZ6R141SFVDA76GDZX0      |
| flame-resistant  | pcat_01KK58WG6EXEE2DMWCKVJ45M1G      |
| casual-wear      | pcat_01KK58WGDNTPDJBHX7ZS6V0Y1C      |
| safety-supplies  | pcat_01KK58WGMXFMQERY7HB42JYC9Q      |

## How to Import a New Brand

### Step 1: Write an import script

Create `backend/src/scripts/import-[brand]-upc.mjs`. The script should:
- Read the supplier's XLSX file from `backend/data/` or `pos/public/`
- Map supplier column names to standard fields (this is unique per supplier)
- Write entries to `upc-lookup.json`

**OR** add a parser function to `backend/src/scripts/generate-upc-lookup.mjs` which is the master multi-brand import script. Currently handles: Timberland PRO, Carhartt, Blundstone, Redback. Keen has its own standalone import script.

**Column mapping examples by brand:**

| Standard Field     | Carhartt              | Timberland PRO   | Blundstone       | Redback        | Keen           |
|--------------------|-----------------------|------------------|------------------|----------------|----------------|
| upc                | UPC                   | UPC Code         | Barcode EAN13    | col[4]         | UPC            |
| title              | Long Description      | Material Name    | Product Name     | col[0]         | Style Name     |
| material_number    | Material              | Material #       | Item Number      | col[1]         | Style #        |
| color              | Color                 | Color (decoded)  | Colour           | col[2]         | Color Name     |
| size               | Product Size          | Size1            | Real Size Code   | col[3]         | Size           |
| wholesale_price    | List Price            | Wholesale        | (not provided)   | col[5]         | WHOLESALE      |
| map_price          | MAP                   | (not provided)   | (not provided)   | col[6]         | MSRP           |
| description        | ConsumerCopyPoints    | —                | —                | —              | (generated)    |
| features           | RetailCopyPoints      | —                | —                | —              | —              |
| care_instructions  | CareInstructions      | —                | —                | —              | —              |
| fabric             | Fabric Content        | —                | —                | —              | —              |
| fit                | Fit Length            | —                | —                | —              | —              |

### Step 2: Run enrichment

```bash
node backend/src/scripts/enrich-upc-lookup.mjs
```

This script (`backend/src/scripts/enrich-upc-lookup.mjs`):
- Removes banned tags (e.g., "Safety Footwear" — redundant with category name)
- Generates smart tags for entries missing them via `BRAND_TAG_GENERATORS`
- Generates descriptions for entries missing them via `BRAND_DESC_GENERATORS`
- **Keeps existing supplier descriptions** (e.g., Carhartt's detailed copy)
- Only fills in blanks — never overwrites existing data

**To add a new brand to enrichment:**
1. Add a function in `BRAND_TAG_GENERATORS["NewBrand"]` — returns tag array from entry data
2. Add a function in `BRAND_DESC_GENERATORS["NewBrand"]` — returns description string
3. If the supplier provides good descriptions, skip the description generator

**Tag guidelines:**
- Tags should be useful product attributes: toe type, waterproof, FR rated, fit, etc.
- Never use category names as tags (e.g., "Safety Footwear", "Work Wear")
- Keep tags short and consistent across brands

### Step 3: Seed products to database

Create a seed script like `backend/src/scripts/seed-[brand].mjs` that:
- Logs in via `/auth/user/emailpass`
- Reads UPC entries from `upc-lookup.json` filtered by brand
- Groups by style/material_number, then by color
- POSTs to `/admin/pos/receive/new-product` with `category_id`
- Includes 100ms+ delay between requests to avoid overwhelming Render

```bash
node backend/src/scripts/seed-[brand].mjs
```

**Important:** Always pass `category_id` when seeding! Products without a category won't appear in any collection on the frontend. See category IDs table above.

### Step 4: Backfill tags/descriptions to existing products

If products already exist in the database (e.g., imported before tags were added):

```bash
node backend/src/scripts/backfill-tags.mjs
```

This matches products by variant barcode → UPC lookup, then updates metadata (tags, description, brand, features, care_instructions, fabric, fit, origin). Uses 800ms delay between API calls to avoid 502/503 on Render free tier.

## Script Reference

| Script                         | Purpose                                                    |
|--------------------------------|------------------------------------------------------------|
| `generate-upc-lookup.mjs`     | Master import: Timberland PRO, Carhartt, Blundstone, Redback |
| `import-keen-upc.mjs`         | Import Keen Utility UPCs from XLSX                         |
| `enrich-upc-lookup.mjs`       | Add smart tags + auto-generate descriptions                |
| `add-tags-to-lookup.mjs`      | Legacy: first-pass tag generation (superseded by enrich)   |
| `fix-tags-add-descriptions.mjs` | Legacy: one-time fix (superseded by enrich)              |
| `seed-keen.mjs`               | Seed Keen products to Medusa                               |
| `seed-bulk.mjs`               | Seed products in bulk                                      |
| `assign-keen-category.mjs`    | Assign Keen products to Safety Footwear category           |
| `backfill-tags.mjs`           | Push tags/descriptions from UPC lookup to existing products |
| `check-brands.mjs`            | Audit: show tag/description coverage per brand             |

## Admin Credentials

- Email: `admin@safetyhouse.ca`
- Password: `inventory`

## Receive Endpoint

`POST /admin/pos/receive/new-product` — Creates a product or adds a variant if the product handle already exists.

Key fields: `title`, `barcode`, `sku`, `price` (cents), `currency_code`, `quantity`, `category_id`, `size`, `color`, `brand`, `tags[]`, `description`, `features`, `care_instructions`, `fabric`, `fit`

The endpoint:
- Strips color from handle so variants share one product listing
- Uses barcode (UPC) as SKU for uniqueness
- Auto-resolves location_id and sales_channel_id
- Creates inventory levels at the default stock location
- Logs to persistent receive log
