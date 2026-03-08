// Medusa v2 Store API client — drop-in replacement for shopify.ts
// All exported interfaces and function signatures match the Shopify client exactly.

const BACKEND_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY as string;

// ---------------------------------------------------------------------------
// In-memory cache (server-side) — avoids hitting Render on every navigation
// ---------------------------------------------------------------------------

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const _cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | undefined {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T, ttl = CACHE_TTL): void {
  _cache.set(key, { data, expires: Date.now() + ttl });
}

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------

async function medusaFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Medusa API ${res.status}: ${text}`);
  }
  // DELETE may return 204
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

async function cachedFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const key = path;
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return cached;
  const data = await medusaFetch<T>(path, options);
  cacheSet(key, data);
  return data;
}

// ---------------------------------------------------------------------------
// Region cache — fetched once per process
// ---------------------------------------------------------------------------

let _regionIdPromise: Promise<string> | null = null;

function getRegionId(): Promise<string> {
  if (!_regionIdPromise) {
    _regionIdPromise = medusaFetch<{ regions: { id: string }[] }>(
      "/store/regions",
    ).then((data) => {
      if (!data.regions?.length) throw new Error("No regions found");
      return data.regions[0].id;
    });
  }
  return _regionIdPromise;
}

// ---------------------------------------------------------------------------
// Medusa raw types (what the API actually returns)
// ---------------------------------------------------------------------------

interface MedusaRawProduct {
  id: string;
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  thumbnail: string | null;
  status: string;
  created_at: string;
  type: { value: string } | null;
  collection: { title: string; handle: string } | null;
  options?: { title: string; values: { value: string }[] }[];
  variants?: {
    id: string;
    title: string;
    sku: string;
    calculated_price?: { calculated_amount: number };
    prices?: { amount: number; currency_code: string }[];
    inventory_quantity?: number;
    options?: { value: string }[];
  }[];
  images?: { url: string }[];
}

interface MedusaRawCategory {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  products?: MedusaRawProduct[];
  metadata?: Record<string, unknown>;
}

interface MedusaRawCartItem {
  id: string;
  quantity: number;
  variant_id: string;
  title: string;
  unit_price: number;
  variant: {
    product: {
      title: string;
      handle: string;
      thumbnail: string | null;
    };
  };
}

interface MedusaRawCart {
  id: string;
  items: MedusaRawCartItem[];
  total: number;
  subtotal: number;
}

// ---------------------------------------------------------------------------
// Shopify-compatible interfaces (exact same shapes as shopify.ts)
// ---------------------------------------------------------------------------

export interface ShopifyImage {
  url: string;
  altText: string | null;
}

export interface ShopifyPrice {
  amount: string;
  currencyCode: string;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: ShopifyPrice;
}

export interface ProductMeta {
  brand?: string;
  color?: string;
  material_number?: string;
  features?: string;
  care_instructions?: string;
  fabric?: string;
  fit?: string;
  origin?: string;
  fr?: boolean;
  hi_vis?: boolean;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  vendor: string;
  productType: string;
  createdAt: string;
  meta: ProductMeta;
  options: { name: string; values: string[] }[];
  featuredImage: ShopifyImage | null;
  priceRange: {
    minVariantPrice: ShopifyPrice;
    maxVariantPrice: ShopifyPrice;
  };
  images: {
    edges: { node: ShopifyImage }[];
  };
  variants: {
    edges: {
      node: ShopifyVariant;
    }[];
  };
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface PaginatedProducts {
  products: ShopifyProduct[];
  pageInfo: PageInfo;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  image: ShopifyImage | null;
  products: {
    edges: { node: ShopifyProduct }[];
    pageInfo: PageInfo;
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: {
    edges: {
      node: {
        id: string;
        quantity: number;
        merchandise: {
          id: string;
          title: string;
          product: {
            title: string;
            handle: string;
            featuredImage: ShopifyImage | null;
          };
          price: ShopifyPrice;
        };
      };
    }[];
  };
  cost: {
    totalAmount: ShopifyPrice;
    subtotalAmount: ShopifyPrice;
  };
}

export interface SearchResult {
  products: ShopifyProduct[];
  pageInfo: PageInfo;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Currency constant
// ---------------------------------------------------------------------------

const CURRENCY = "CAD";

// ---------------------------------------------------------------------------
// Adapters: Medusa raw -> Shopify-shaped
// ---------------------------------------------------------------------------

function centsToPrice(cents: number | undefined | null): ShopifyPrice {
  const amt = typeof cents === "number" ? cents : 0;
  return { amount: (amt / 100).toFixed(2), currencyCode: CURRENCY };
}

function getVariantPrice(v: MedusaRawProduct["variants"] extends (infer V)[] | undefined ? V : never): number | null {
  // Prefer calculated_price (region-aware), fall back to direct prices array
  if (v.calculated_price?.calculated_amount != null) {
    return v.calculated_price.calculated_amount;
  }
  // Use CAD price first, then any available price
  if (v.prices?.length) {
    const cadPrice = v.prices.find((p) => p.currency_code === "cad");
    return (cadPrice ?? v.prices[0]).amount;
  }
  return null;
}

function adaptProduct(p: MedusaRawProduct): ShopifyProduct {
  const variants = (p.variants ?? []).map((v) => {
    const available =
      v.inventory_quantity === undefined ? true : v.inventory_quantity > 0;
    return {
      id: v.id,
      title: v.title || "Default",
      availableForSale: available,
      price: centsToPrice(getVariantPrice(v)),
    };
  });

  // Compute price range from variants
  const prices = variants.map((v) => parseFloat(v.price.amount));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const images: ShopifyImage[] = (p.images ?? []).map((img) => ({
    url: img.url,
    altText: null,
  }));

  const featuredImage: ShopifyImage | null = p.thumbnail
    ? { url: p.thumbnail, altText: null }
    : images.length
      ? images[0]
      : null;

  const availableForSale = variants.length
    ? variants.some((v) => v.availableForSale)
    : true;

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description ?? "",
    descriptionHtml: p.description ?? "",
    availableForSale,
    vendor: (p as any).metadata?.brand || p.subtitle || p.collection?.title || "",
    productType: p.type?.value ?? "",
    createdAt: p.created_at,
    meta: ((p as any).metadata || {}) as ProductMeta,
    options: (p.options ?? []).map((o) => ({
      name: o.title,
      values: o.values.map((v) => v.value),
    })),
    featuredImage,
    priceRange: {
      minVariantPrice: {
        amount: minPrice.toFixed(2),
        currencyCode: CURRENCY,
      },
      maxVariantPrice: {
        amount: maxPrice.toFixed(2),
        currencyCode: CURRENCY,
      },
    },
    images: {
      edges: images.map((img) => ({ node: img })),
    },
    variants: {
      edges: variants.map((v) => ({ node: v })),
    },
  };
}

function adaptCategory(
  cat: MedusaRawCategory,
  products: ShopifyProduct[],
  pageInfo: PageInfo,
): ShopifyCollection {
  return {
    id: cat.id,
    title: cat.name,
    handle: cat.handle,
    description: cat.description ?? "",
    image: null,
    products: {
      edges: products.map((p) => ({ node: p })),
      pageInfo,
    },
  };
}

function adaptCart(c: MedusaRawCart): ShopifyCart {
  const totalQuantity = c.items.reduce((sum, i) => sum + i.quantity, 0);
  return {
    id: c.id,
    checkoutUrl: "/checkout",
    totalQuantity,
    lines: {
      edges: c.items.map((item) => ({
        node: {
          id: item.id,
          quantity: item.quantity,
          merchandise: {
            id: item.variant_id,
            title: item.title,
            product: {
              title: item.variant?.product?.title ?? item.title,
              handle: item.variant?.product?.handle ?? "",
              featuredImage: item.variant?.product?.thumbnail
                ? { url: item.variant.product.thumbnail, altText: null }
                : null,
            },
            price: centsToPrice(item.unit_price),
          },
        },
      })),
    },
    cost: {
      totalAmount: centsToPrice(c.total),
      subtotalAmount: centsToPrice(c.subtotal),
    },
  };
}

// ---------------------------------------------------------------------------
// Cursor helpers (offset encoded as base-64 string)
// ---------------------------------------------------------------------------

function encodeCursor(offset: number): string {
  return btoa(String(offset));
}

function decodeCursor(cursor: string | undefined | null): number {
  if (!cursor) return 0;
  try {
    return parseInt(atob(cursor), 10) || 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Product fields param for requests that need prices / inventory
// ---------------------------------------------------------------------------

const PRODUCT_FIELDS =
  "+subtitle,+metadata,*variants.prices,+variants.calculated_price,+variants.inventory_quantity";

// ---------------------------------------------------------------------------
// Public API — same signatures as shopify.ts
// ---------------------------------------------------------------------------

export async function getProducts(first = 20): Promise<ShopifyProduct[]> {
  const regionId = await getRegionId();
  const params = new URLSearchParams({
    limit: String(first),
    offset: "0",
    fields: PRODUCT_FIELDS,
    region_id: regionId,
  });
  const data = await cachedFetch<{ products: MedusaRawProduct[] }>(
    `/store/products?${params}`,
  );
  return data.products.map(adaptProduct);
}

export async function getProductByHandle(
  handle: string,
): Promise<ShopifyProduct | null> {
  const regionId = await getRegionId();
  const params = new URLSearchParams({
    handle,
    fields: PRODUCT_FIELDS,
    region_id: regionId,
  });
  const data = await cachedFetch<{ products: MedusaRawProduct[] }>(
    `/store/products?${params}`,
  );
  if (!data.products?.length) return null;
  return adaptProduct(data.products[0]);
}

export async function getProductRecommendations(
  productId: string,
): Promise<ShopifyProduct[]> {
  // Medusa v2 has no dedicated recommendations endpoint.
  // Fetch the product to determine its collection, then return other products
  // from the same collection. Falls back to latest products.
  try {
    const regionId = await getRegionId();

    // Fetch the source product to find its collection / category
    const srcParams = new URLSearchParams({
      id: productId,
      fields: PRODUCT_FIELDS,
      region_id: regionId,
    });
    const srcData = await cachedFetch<{ products: MedusaRawProduct[] }>(
      `/store/products?${srcParams}`,
    );
    const src = srcData.products?.[0];

    if (src?.collection?.handle) {
      // Try to get products from the same category
      const catData = await cachedFetch<{
        product_categories: MedusaRawCategory[];
      }>(`/store/product-categories?handle=${src.collection.handle}`);
      const cat = catData.product_categories?.[0];
      if (cat) {
        const catProdParams = new URLSearchParams({
          category_id: cat.id,
          fields: PRODUCT_FIELDS,
          region_id: regionId,
          limit: "9",
        });
        const catProdData = await cachedFetch<{ products: MedusaRawProduct[] }>(
          `/store/products?${catProdParams}`,
        );
        if (catProdData.products?.length) {
          return catProdData.products
            .filter((p) => p.id !== productId)
            .slice(0, 8)
            .map(adaptProduct);
        }
      }
    }
  } catch {
    // fall through to generic products
  }

  // Fallback: return latest products
  const products = await getProducts(8);
  return products.filter((p) => p.id !== productId).slice(0, 8);
}

export async function getCollections(
  first = 20,
): Promise<ShopifyCollection[]> {
  const data = await cachedFetch<{
    product_categories: MedusaRawCategory[];
  }>(`/store/product-categories?limit=${first}`);
  return data.product_categories.map((cat) =>
    adaptCategory(cat, [], { hasNextPage: false, endCursor: null }),
  );
}

export async function getCollectionMeta(
  handle: string,
): Promise<ShopifyCollection | null> {
  const catData = await cachedFetch<{
    product_categories: MedusaRawCategory[];
  }>(`/store/product-categories?handle=${handle}`);
  const cat = catData.product_categories?.[0];
  if (!cat) return null;
  return adaptCategory(cat, [], { hasNextPage: false, endCursor: null });
}

export async function getCollectionByHandle(
  handle: string,
  first = 20,
  sortKey?: string,
  reverse?: boolean,
  after?: string,
): Promise<ShopifyCollection | null> {
  // Fetch category by handle
  const catData = await cachedFetch<{
    product_categories: MedusaRawCategory[];
  }>(`/store/product-categories?handle=${handle}`);

  const cat = catData.product_categories?.[0];
  if (!cat) return null;

  // Fetch products in this category with proper price fields
  const regionId = await getRegionId();
  const prodParams = new URLSearchParams({
    category_id: cat.id,
    fields: PRODUCT_FIELDS,
    region_id: regionId,
    limit: "100",
    offset: "0",
  });
  const prodData = await cachedFetch<{ products: MedusaRawProduct[] }>(
    `/store/products?${prodParams}`,
  );

  let products = (prodData.products ?? []).map(adaptProduct);

  // Sort
  if (sortKey) {
    const key = sortKey.toLowerCase();
    products.sort((a, b) => {
      if (key === "price") {
        return (
          parseFloat(a.priceRange.minVariantPrice.amount) -
          parseFloat(b.priceRange.minVariantPrice.amount)
        );
      }
      if (key === "title" || key === "best_selling" || key === "best-selling") {
        return a.title.localeCompare(b.title);
      }
      if (key === "created" || key === "created_at") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      return 0;
    });
    if (reverse) products.reverse();
  }

  // Return all products — pagination is handled client-side
  return adaptCategory(cat, products, { hasNextPage: false, endCursor: null });
}

export async function getCollectionProducts(
  handle: string,
  first = 20,
  after?: string,
  sortKey?: string,
  reverse?: boolean,
): Promise<PaginatedProducts> {
  const collection = await getCollectionByHandle(
    handle,
    first,
    sortKey,
    reverse,
    after,
  );
  if (!collection)
    return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
  return {
    products: collection.products.edges.map((e) => e.node),
    pageInfo: collection.products.pageInfo,
  };
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export async function createCart(
  variantId: string,
  quantity = 1,
): Promise<ShopifyCart> {
  const regionId = await getRegionId();

  // Create the cart first
  const cartData = await medusaFetch<{ cart: MedusaRawCart }>(
    "/store/carts",
    {
      method: "POST",
      body: JSON.stringify({ region_id: regionId }),
    },
  );

  // Add the line item
  const updated = await medusaFetch<{ cart: MedusaRawCart }>(
    `/store/carts/${cartData.cart.id}/line-items`,
    {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity }),
    },
  );

  return adaptCart(updated.cart);
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<ShopifyCart> {
  const data = await medusaFetch<{ cart: MedusaRawCart }>(
    `/store/carts/${cartId}/line-items`,
    {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity }),
    },
  );
  return adaptCart(data.cart);
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[],
): Promise<ShopifyCart> {
  // Medusa deletes one line at a time
  for (const lineId of lineIds) {
    await medusaFetch(
      `/store/carts/${cartId}/line-items/${lineId}`,
      { method: "DELETE" },
    );
  }
  // Return updated cart
  return (await getCart(cartId))!;
}

export async function updateCartLines(
  cartId: string,
  lines: { id: string; quantity: number }[],
): Promise<ShopifyCart> {
  // Medusa updates one line at a time
  for (const line of lines) {
    await medusaFetch(
      `/store/carts/${cartId}/line-items/${line.id}`,
      {
        method: "POST",
        body: JSON.stringify({ quantity: line.quantity }),
      },
    );
  }
  return (await getCart(cartId))!;
}

export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  try {
    const data = await medusaFetch<{ cart: MedusaRawCart }>(
      `/store/carts/${cartId}`,
    );
    return adaptCart(data.cart);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function predictiveSearch(
  query: string,
  first = 6,
): Promise<ShopifyProduct[]> {
  const regionId = await getRegionId();
  const params = new URLSearchParams({
    q: query,
    limit: String(first),
    offset: "0",
    fields: PRODUCT_FIELDS,
    region_id: regionId,
  });
  const data = await medusaFetch<{ products: MedusaRawProduct[] }>(
    `/store/products?${params}`,
  );
  return data.products.map(adaptProduct);
}

export async function searchProducts(
  query: string,
  first = 20,
  after?: string,
): Promise<SearchResult> {
  const regionId = await getRegionId();
  const offset = decodeCursor(after);
  const params = new URLSearchParams({
    q: query,
    limit: String(first),
    offset: String(offset),
    fields: PRODUCT_FIELDS,
    region_id: regionId,
  });
  const data = await medusaFetch<{
    products: MedusaRawProduct[];
    count: number;
    offset: number;
    limit: number;
  }>(`/store/products?${params}`);

  const products = data.products.map(adaptProduct);
  const nextOffset = offset + first;
  const hasNextPage = nextOffset < data.count;

  return {
    products,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? encodeCursor(nextOffset) : null,
    },
    totalCount: data.count,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Cache warming — prefetch all collection pages in the background
// ---------------------------------------------------------------------------

const COLLECTION_HANDLES = [
  "work-wear",
  "safety-footwear",
  "safety-supplies",
  "flame-resistant",
  "casual-wear",
  "school-wear",
];

let _warmingStarted = false;

export function warmCollectionCache(): void {
  if (_warmingStarted) return;
  _warmingStarted = true;
  // Fire-and-forget: prefetch all collections in parallel
  Promise.all(
    COLLECTION_HANDLES.map((handle) =>
      getCollectionByHandle(handle).catch(() => null),
    ),
  ).catch(() => {});
}

export function formatPrice(price: ShopifyPrice): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currencyCode,
  }).format(parseFloat(price.amount));
}
