import { component$, useSignal, useComputed$, $, useVisibleTask$, useTask$ } from "@builder.io/qwik";
import { routeLoader$, Link, useLocation, useNavigate } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { getCollectionByHandle, formatPrice, addToCart, createCart } from "~/lib/medusa";
import type { ShopifyProduct, ShopifyVariant } from "~/lib/medusa";

const COLOR_MAP: Record<string, string> = {
  "black": "#1a1a1a", "dark navy": "#1b2a4a", "navy": "#1b3a5c",
  "dark blue": "#1a3a5c", "blue": "#2563eb", "light blue": "#60a5fa",
  "gray": "#6b7280", "grey": "#6b7280", "light gray": "#d1d5db", "light grey": "#d1d5db",
  "dark gray": "#374151", "dark grey": "#374151", "charcoal": "#36454f",
  "white": "#f8f8f8", "red": "#dc2626", "dark red": "#991b1b", "dark crimson": "#8b0000",
  "brown": "#78350f", "dark brown": "#4a2512", "canyon brown": "#8b5e3c",
  "carhartt brown": "#7a5230", "frontier brown": "#6b4423",
  "khaki": "#c3b091", "tan": "#d2b48c", "beige": "#e8dcc8",
  "green": "#16a34a", "dark green": "#14532d", "olive": "#556b2f",
  "moss": "#4a5d23", "basil": "#3e6b3e",
  "orange": "#ea580c", "blaze orange": "#ff6600", "hi-vis orange": "#ff5500",
  "yellow": "#eab308", "hi-vis yellow": "#d4e600", "brite lime": "#c5e600",
  "hi-vis": "#d4e600", "hi-vis green": "#76b900",
  "pink": "#ec4899", "purple": "#7c3aed",
  "camo": "linear-gradient(135deg,#4a5d23 25%,#6b7f3a 25%,#6b7f3a 50%,#374a20 50%,#374a20 75%,#556b2f 75%)",
};

function getProductColors(product: ShopifyProduct): string[] {
  const colorOpt = product.options.find((o) => o.name === "Color");
  return colorOpt?.values ?? (product.meta?.color ? [product.meta.color] : []);
}

function getColorCss(name: string): string {
  return COLOR_MAP[name.toLowerCase().trim()] || "#9ca3af";
}

const SORT_OPTIONS = [
  { value: "best-selling", label: "Best Selling", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { value: "newest", label: "New Arrivals", icon: "M12 8v4l3 3" },
  { value: "price-asc", label: "Price: Low to High", icon: "M3 17l6-6 4 4 8-8" },
  { value: "price-desc", label: "Price: High to Low", icon: "M3 7l6 6 4-4 8 8" },
  { value: "title-asc", label: "Name: A\u2013Z", icon: "M3 6h18M3 12h12M3 18h6" },
];

function sortProducts(products: ShopifyProduct[], sortValue: string): ShopifyProduct[] {
  if (!sortValue) return products;
  const sorted = [...products];
  switch (sortValue) {
    case "price-asc":
      return sorted.sort((a, b) =>
        parseFloat(a.priceRange.minVariantPrice.amount) - parseFloat(b.priceRange.minVariantPrice.amount));
    case "price-desc":
      return sorted.sort((a, b) =>
        parseFloat(b.priceRange.minVariantPrice.amount) - parseFloat(a.priceRange.minVariantPrice.amount));
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "newest":
      return sorted.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "best-selling":
      return products;
    default:
      return products;
  }
}

export const useCollection = routeLoader$(async (requestEvent) => {
  const handle = requestEvent.params.handle;

  try {
    const collection = await getCollectionByHandle(handle);

    if (!collection) {
      requestEvent.status(404);
      return null;
    }

    // Cache at edge for 5 min, serve stale up to 1 hour while revalidating
    requestEvent.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600",
    );

    return collection;
  } catch (err) {
    console.error(`[collection/${handle}] Failed to load:`, err);
    requestEvent.status(500);
    return null;
  }
});

export default component$(() => {
  const collection = useCollection();
  const location = useLocation();
  const nav = useNavigate();
  const currentSort = useSignal(location.url.searchParams.get("sort") || "newest");
  const gridCols = useSignal<1 | 2 | 3 | 4>(4);

  // Filter state
  const selectedBrands = useSignal<string[]>([]);
  const selectedTypes = useSignal<string[]>([]);
  const selectedSizes = useSignal<string[]>([]);
  const selectedColors = useSignal<string[]>([]);
  const priceRange = useSignal<[number, number]>([0, 0]);
  const priceFilterActive = useSignal(false);
  const inStockOnly = useSignal(false);
  const collectionSearch = useSignal("");
  const mobileFiltersOpen = useSignal(false);

  // Quick view state
  const quickViewProduct = useSignal<ShopifyProduct | null>(null);
  const qvSelectedVariant = useSignal("");
  const qvAdding = useSignal(false);
  const qvAdded = useSignal(false);
  const qvSelectedImage = useSignal(0);

  // Sidebar section collapse state (desktop)
  const sectionOpen = useSignal<Record<string, boolean>>({
    sort: true,
    type: true,
    brand: true,
    size: true,
    color: false,
    price: false,
    availability: true,
  });

  const toggleSection = $((key: string) => {
    sectionOpen.value = { ...sectionOpen.value, [key]: !sectionOpen.value[key] };
  });

  if (!collection.value) {
    return (
      <div class="text-center py-24 px-8">
        <h1 class="text-2xl font-bold mb-4">Collection not found</h1>
        <Link
          href="/"
          class="inline-flex items-center justify-center py-3 px-7 text-[0.9rem] font-semibold rounded-lg border-none transition-all duration-200 bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-lg"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const c = collection.value;

  // All products loaded server-side; client-side pagination controls how many are displayed
  const allProducts = useSignal<ShopifyProduct[]>(c.products.edges.map((e) => e.node));
  const displayCount = useSignal(12);

  // Re-sync products when collection changes via client-side navigation
  useTask$(({ track }) => {
    const col = track(() => collection.value);
    if (col) {
      allProducts.value = col.products.edges.map((e) => e.node);
      displayCount.value = 12;
    }
  });

  const loadMore = $(() => {
    displayCount.value = displayCount.value + 12;
  });

  // Derive filter options from products
  const brands = useComputed$(() => {
    const vendorSet = new Set<string>();
    for (const p of allProducts.value) {
      if (p.vendor) vendorSet.add(p.vendor);
    }
    return [...vendorSet].sort();
  });

  const productTypes = useComputed$(() => {
    const typeSet = new Set<string>();
    for (const p of allProducts.value) {
      if (p.productType) typeSet.add(p.productType);
    }
    return [...typeSet].sort();
  });

  const sizes = useComputed$(() => {
    const sizeSet = new Set<string>();
    for (const p of allProducts.value) {
      if (!p.options) continue;
      const sizeOpt = p.options.find((o) => o.name.toLowerCase() === "size");
      if (sizeOpt) {
        for (const v of sizeOpt.values) sizeSet.add(v);
      }
    }
    return [...sizeSet];
  });

  const colors = useComputed$(() => {
    const colorSet = new Set<string>();
    for (const p of allProducts.value) {
      for (const c of getProductColors(p)) {
        if (c) colorSet.add(c);
      }
    }
    return [...colorSet].sort();
  });

  const priceExtent = useComputed$(() => {
    let min = Infinity, max = 0;
    for (const p of allProducts.value) {
      const val = parseFloat(p.priceRange.minVariantPrice.amount);
      if (val < min) min = val;
      if (val > max) max = val;
    }
    return [min === Infinity ? 0 : Math.floor(min), Math.ceil(max)] as [number, number];
  });

  const activeFilterCount = useComputed$(() => {
    let count = 0;
    if (selectedBrands.value.length > 0) count += selectedBrands.value.length;
    if (selectedTypes.value.length > 0) count += selectedTypes.value.length;
    if (selectedSizes.value.length > 0) count += selectedSizes.value.length;
    if (selectedColors.value.length > 0) count += selectedColors.value.length;
    if (priceFilterActive.value) count++;
    if (inStockOnly.value) count++;
    return count;
  });

  const clearAllFilters = $(() => {
    selectedBrands.value = [];
    selectedTypes.value = [];
    selectedSizes.value = [];
    selectedColors.value = [];
    priceFilterActive.value = false;
    inStockOnly.value = false;
  });

  const openQuickView = $((product: ShopifyProduct) => {
    const collectionHandle = location.params.handle;
    const productUrl = `/product/${product.handle}/?collection=${collectionHandle}`;

    // Desktop: go directly to product page
    if (window.innerWidth >= 768) {
      nav(productUrl);
      return;
    }

    // Mobile: open quick view and prefetch product page
    quickViewProduct.value = product;
    qvSelectedImage.value = 0;
    qvAdded.value = false;
    qvAdding.value = false;
    const variants = product.variants.edges.map((e) => e.node);
    const available = variants.find((v) => v.availableForSale);
    qvSelectedVariant.value = available?.id || variants[0]?.id || "";

    if (!document.querySelector(`link[href="${productUrl}"]`)) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = productUrl;
      document.head.appendChild(link);
    }
  });

  const qvAddToCart = $(async () => {
    if (!qvSelectedVariant.value || qvAdding.value) return;
    qvAdding.value = true;
    qvAdded.value = false;
    try {
      const cartId = localStorage.getItem("cart_id");
      let cart;
      if (cartId) {
        cart = await addToCart(cartId, qvSelectedVariant.value, 1);
      } else {
        cart = await createCart(qvSelectedVariant.value, 1);
      }
      localStorage.setItem("cart_id", cart.id);
      localStorage.setItem("cart_checkout_url", cart.checkoutUrl);
      localStorage.setItem("cart_count", String(cart.totalQuantity));
      qvAdded.value = true;
      setTimeout(() => (qvAdded.value = false), 2500);
    } catch (err) {
      console.error("Add to cart failed:", err);
    } finally {
      qvAdding.value = false;
    }
  });

  const filteredProducts = useComputed$(() => {
    const sorted = sortProducts(allProducts.value, currentSort.value);
    let result = sorted;

    if (selectedBrands.value.length > 0) {
      result = result.filter((p: ShopifyProduct) => selectedBrands.value.includes(p.vendor));
    }
    if (selectedTypes.value.length > 0) {
      result = result.filter((p: ShopifyProduct) => selectedTypes.value.includes(p.productType));
    }
    if (selectedSizes.value.length > 0) {
      result = result.filter((p: ShopifyProduct) => {
        if (!p.options) return false;
        const sizeOpt = p.options.find((o) => o.name.toLowerCase() === "size");
        if (!sizeOpt) return false;
        return sizeOpt.values.some((v) => selectedSizes.value.includes(v));
      });
    }
    if (selectedColors.value.length > 0) {
      result = result.filter((p: ShopifyProduct) => {
        const pColors = getProductColors(p);
        return pColors.some((c) => selectedColors.value.includes(c));
      });
    }
    if (priceFilterActive.value && priceRange.value[1] > 0) {
      result = result.filter((p: ShopifyProduct) => {
        const val = parseFloat(p.priceRange.minVariantPrice.amount);
        return val >= priceRange.value[0] && val <= priceRange.value[1];
      });
    }
    if (inStockOnly.value) {
      result = result.filter((p: ShopifyProduct) => p.availableForSale);
    }
    if (collectionSearch.value.trim()) {
      const q = collectionSearch.value.trim().toLowerCase();
      result = result.filter((p: ShopifyProduct) =>
        p.title.toLowerCase().includes(q) || p.vendor.toLowerCase().includes(q)
      );
    }
    return result;
  });

  const displayedProducts = useComputed$(() => {
    return filteredProducts.value.slice(0, displayCount.value);
  });

  const hasMore = useComputed$(() => {
    return displayCount.value < filteredProducts.value.length;
  });

  // Hero
  const heroData: Record<string, { subtitle?: string; images: string[]; objectPos?: string }> = {
    "work-wear": { subtitle: "Durable workwear built for the toughest jobs.", images: ["/workwear.jpg", "/carharrt-work-wear-ottawa.jpg", "/work-wear.jpg"], objectPos: "center 30%" },
    "safety-footwear": {
      subtitle: "CSA-approved boots and shoes from trusted brands.",
      images: ["/footwear-hero.jpg", "/footwear.jpg", "/work_boots_ottawa.png"],
    },
    "flame-resistant": { subtitle: "Certified FR clothing to keep you protected on the job.", images: ["/flame-resistant-clothing.jpg", "/flame-resistant-clothing-ottawa.jpg", "/flame-resistant-clothing-ottawa.png"] },
    "safety-supplies": { subtitle: "Gloves, eyewear, hard hats and everything in between.", images: ["/safety-supplies.jpg", "/safety_clothing_ottawa.png", "/TheSafetyHouse-March2023-37.jpg"], objectPos: "center 45%" },
    "casual-wear": { subtitle: "Uniforms and essentials for the school year.", images: ["/schoolwear.jpg", "/personalized_swag_ottawa.png", "/TheSafetyHouse-March2023-38.jpg"] },
  };
  const hero = heroData[c.handle] || { images: [] };
  const heroImages = hero.images.length > 0 ? hero.images : [c.image?.url].filter(Boolean) as string[];
  const heroSlide = useSignal(0);

  useVisibleTask$(({ cleanup }) => {
    if (heroImages.length < 2) return;
    const id = setInterval(() => {
      heroSlide.value = (heroSlide.value + 1) % heroImages.length;
    }, 5000);
    cleanup(() => clearInterval(id));
  });

  // Shared filter sidebar content (used in desktop sidebar and mobile drawer)
  const FilterContent = () => (
    <div class="space-y-0.5">
      {/* Sort */}
      <div class="border-b border-gray-200 dark:border-gray-700/50">
        <button
          type="button"
          class="w-full flex items-center justify-between py-3 px-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick$={() => toggleSection("sort")}
        >
          Sort By
          <svg class={`w-3.5 h-3.5 transition-transform duration-200 ${sectionOpen.value.sort ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {sectionOpen.value.sort && (
          <div class="pb-3 space-y-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                class={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-all duration-150 ${
                  currentSort.value === opt.value
                    ? "stripe-active text-primary font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
                onClick$={() => {
                  currentSort.value = opt.value;
                  const url = new URL(window.location.href);
                  url.searchParams.set("sort", opt.value);
                  history.replaceState(null, "", url.pathname + url.search);
                }}
              >
                <svg class="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                  <path d={opt.icon} />
                </svg>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Brand */}
      {brands.value.length > 0 && (
        <div class="border-b border-gray-200 dark:border-gray-700/50">
          <button
            type="button"
            class="w-full flex items-center justify-between py-3 px-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick$={() => toggleSection("brand")}
          >
            <span class="flex items-center gap-2">
              Brand
              {selectedBrands.value.length > 0 && (
                <span class="bg-primary text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none">
                  {selectedBrands.value.length}
                </span>
              )}
            </span>
            <svg class={`w-3.5 h-3.5 transition-transform duration-200 ${sectionOpen.value.brand ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {sectionOpen.value.brand && (
            <div class="pb-3 space-y-0.5 max-h-[240px] overflow-y-auto">
              {brands.value.map((brand) => (
                <label
                  key={brand}
                  class="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/50 w-4 h-4"
                    checked={selectedBrands.value.includes(brand)}
                    onChange$={() => {
                      const current = [...selectedBrands.value];
                      const idx = current.indexOf(brand);
                      if (idx >= 0) current.splice(idx, 1);
                      else current.push(brand);
                      selectedBrands.value = current;
                    }}
                  />
                  <span class="flex-1">{brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Type */}
      {productTypes.value.length > 0 && (
        <div class="border-b border-gray-200 dark:border-gray-700/50">
          <button
            type="button"
            class="w-full flex items-center justify-between py-3 px-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick$={() => toggleSection("type")}
          >
            <span class="flex items-center gap-2">
              Type
              {selectedTypes.value.length > 0 && (
                <span class="bg-primary text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none">
                  {selectedTypes.value.length}
                </span>
              )}
            </span>
            <svg class={`w-3.5 h-3.5 transition-transform duration-200 ${sectionOpen.value.type ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {sectionOpen.value.type && (
            <div class="pb-3 space-y-0.5 max-h-[240px] overflow-y-auto">
              {productTypes.value.map((type) => (
                <label
                  key={type}
                  class="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/50 w-4 h-4"
                    checked={selectedTypes.value.includes(type)}
                    onChange$={() => {
                      const current = [...selectedTypes.value];
                      const idx = current.indexOf(type);
                      if (idx >= 0) current.splice(idx, 1);
                      else current.push(type);
                      selectedTypes.value = current;
                    }}
                  />
                  <span class="flex-1">{type}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Size — commented out for now, too complex
      {sizes.value.length > 0 && (
        <div class="border-b border-gray-200 dark:border-gray-700/50">
          <button
            type="button"
            class="w-full flex items-center justify-between py-3 px-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick$={() => toggleSection("size")}
          >
            <span class="flex items-center gap-2">
              Size
              {selectedSizes.value.length > 0 && (
                <span class="bg-primary text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none">
                  {selectedSizes.value.length}
                </span>
              )}
            </span>
            <svg class={`w-3.5 h-3.5 transition-transform duration-200 ${sectionOpen.value.size ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {sectionOpen.value.size && (
            <div class="pb-3">
              <div class="flex flex-wrap gap-1.5 px-1">
                {sizes.value.map((size) => (
                  <button
                    key={size}
                    type="button"
                    class={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                      selectedSizes.value.includes(size)
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                    onClick$={() => {
                      const current = [...selectedSizes.value];
                      const idx = current.indexOf(size);
                      if (idx >= 0) current.splice(idx, 1);
                      else current.push(size);
                      selectedSizes.value = current;
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      */}

      {/* Color */}
      {colors.value.length > 0 && (
        <div class="border-b border-gray-200 dark:border-gray-700/50">
          <button
            type="button"
            class="w-full flex items-center justify-between py-3 px-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick$={() => toggleSection("color")}
          >
            <span class="flex items-center gap-2">
              Color
              {selectedColors.value.length > 0 && (
                <span class="bg-primary text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none">
                  {selectedColors.value.length}
                </span>
              )}
            </span>
            <svg class={`w-3.5 h-3.5 transition-transform duration-200 ${sectionOpen.value.color ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {sectionOpen.value.color && (
            <div class="pb-3">
              <div class="flex flex-wrap gap-2 px-1">
                {colors.value.map((color) => {
                  const css = getColorCss(color);
                  const isGradient = css.startsWith("linear");
                  const isSelected = selectedColors.value.includes(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      class={`w-7 h-7 rounded-full border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 scale-110"
                          : "border-gray-300 dark:border-gray-600 hover:scale-110"
                      }`}
                      style={isGradient ? { background: css } : { backgroundColor: css }}
                      onClick$={() => {
                        const current = [...selectedColors.value];
                        const idx = current.indexOf(color);
                        if (idx >= 0) current.splice(idx, 1);
                        else current.push(color);
                        selectedColors.value = current;
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Price Range */}
      <div class="border-b border-gray-200 dark:border-gray-700/50">
        <button
          type="button"
          class="w-full flex items-center justify-between py-3 px-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick$={() => toggleSection("price")}
        >
          <span class="flex items-center gap-2">
            Price
            {priceFilterActive.value && (
              <span class="bg-primary text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none">
                1
              </span>
            )}
          </span>
          <svg class={`w-3.5 h-3.5 transition-transform duration-200 ${sectionOpen.value.price ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {sectionOpen.value.price && (
          <div class="pb-3 px-1 space-y-3">
            <div class="flex items-center gap-2">
              <div class="flex-1">
                <label class="text-[10px] text-gray-500 uppercase">Min</label>
                <input
                  type="number"
                  class="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  placeholder={`$${priceExtent.value[0]}`}
                  value={priceRange.value[0] || ""}
                  onInput$={(e) => {
                    const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                    priceRange.value = [val, priceRange.value[1]];
                    priceFilterActive.value = true;
                  }}
                />
              </div>
              <span class="text-gray-400 mt-4">–</span>
              <div class="flex-1">
                <label class="text-[10px] text-gray-500 uppercase">Max</label>
                <input
                  type="number"
                  class="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  placeholder={`$${priceExtent.value[1]}`}
                  value={priceRange.value[1] || ""}
                  onInput$={(e) => {
                    const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                    priceRange.value = [priceRange.value[0], val];
                    priceFilterActive.value = true;
                  }}
                />
              </div>
            </div>
            {priceFilterActive.value && (
              <button
                type="button"
                class="text-xs text-primary hover:underline"
                onClick$={() => {
                  priceRange.value = [0, 0];
                  priceFilterActive.value = false;
                }}
              >
                Clear price filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Availability */}
      <div>
        <button
          type="button"
          class="w-full flex items-center justify-between py-3 px-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick$={() => toggleSection("availability")}
        >
          Availability
          <svg class={`w-3.5 h-3.5 transition-transform duration-200 ${sectionOpen.value.availability ? "" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {sectionOpen.value.availability && (
          <div class="pb-3 px-1">
            <label class="flex items-center gap-3 cursor-pointer group">
              <div class={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${inStockOnly.value ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
                <div class={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${inStockOnly.value ? "translate-x-[20px]" : "translate-x-0.5"}`} />
                <input
                  type="checkbox"
                  class="sr-only"
                  checked={inStockOnly.value}
                  onChange$={() => { inStockOnly.value = !inStockOnly.value; }}
                />
              </div>
              <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">In Stock</span>
            </label>
          </div>
        )}
      </div>

      {/* Clear all */}
      {activeFilterCount.value > 0 && (
        <div class="pt-3">
          <button
            type="button"
            class="w-full py-2.5 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all"
            onClick$={clearAllFilters}
          >
            Clear all filters ({activeFilterCount.value})
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Hero */}
      <div class="relative text-white h-[200px] md:h-[260px] text-center overflow-hidden flex flex-col items-center justify-center">
        {heroImages.length > 0 ? (
          heroImages.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={c.image?.altText || ""}
              width={1400}
              height={600}
              fetchPriority={i === 0 ? "high" : "auto"}
              style={hero.objectPos ? { objectPosition: hero.objectPos } : undefined}
              class={`absolute inset-0 w-full h-full object-cover ${hero.objectPos ? '' : 'object-[center_19.5%]'} transition-opacity duration-1000 ease-in-out ${heroSlide.value === i ? "opacity-100" : "opacity-0"}`}
            />
          ))
        ) : null}
        <div class="absolute inset-0 bg-gradient-to-br from-dark/60 to-[#2d2d2d]/50" />
        <div class="absolute inset-0" style="box-shadow: inset 0 0 120px 40px rgba(0,0,0,0.6);" />
        {heroImages.length === 0 && (
          <div class="absolute inset-0 bg-gradient-to-br from-dark to-[#2d2d2d]" />
        )}
        <h1 class="relative z-10 text-4xl md:text-5xl font-extrabold tracking-tight mb-3 px-8">{c.title}</h1>
        {hero.subtitle ? (
          <p class="relative z-10 text-white/60 text-xl max-w-[560px] mx-auto leading-relaxed">{hero.subtitle}</p>
        ) : (
          c.description && <p class="relative z-10 text-white/60 text-xl max-w-[560px] mx-auto leading-relaxed">{c.description}</p>
        )}
        {/* Square slide indicators */}
        {heroImages.length > 1 && (
          <div class="absolute bottom-3 right-4 md:right-8 z-20 flex items-center gap-1.5">
            {heroImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                class={`w-2 h-2 rounded-sm border-none cursor-pointer transition-all duration-300 ${
                  heroSlide.value === i
                    ? "bg-white scale-110"
                    : "bg-white/40 hover:bg-white/70"
                }`}
                onClick$={() => { heroSlide.value = i; }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main layout: sidebar + grid */}
      <div class="flex">
        {/* Desktop sidebar */}
        <aside class="hidden lg:block w-[260px] xl:w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700/40 bg-white dark:bg-[#161616] sticky top-[var(--header-h)] self-start max-h-[calc(100dvh-var(--header-h))] overflow-y-auto">
          <div class="p-5">
            {/* Sidebar header */}
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700/50">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Filters</h2>
                {activeFilterCount.value > 0 && (
                  <span class="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {activeFilterCount.value}
                  </span>
                )}
              </div>
              <div class="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {([3, 4] as const).map((cols) => (
                  <button
                    key={cols}
                    type="button"
                    aria-label={`${cols} column grid`}
                    class={`p-1.5 transition-colors ${gridCols.value === cols ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "bg-white dark:bg-[#1e1e1e] text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                    onClick$={() => { gridCols.value = cols; }}
                  >
                    {cols === 3 ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="1" y="1" width="4" height="4" rx="0.5" /><rect x="6" y="1" width="4" height="4" rx="0.5" /><rect x="11" y="1" width="4" height="4" rx="0.5" />
                        <rect x="1" y="6" width="4" height="4" rx="0.5" /><rect x="6" y="6" width="4" height="4" rx="0.5" /><rect x="11" y="6" width="4" height="4" rx="0.5" />
                        <rect x="1" y="11" width="4" height="4" rx="0.5" /><rect x="6" y="11" width="4" height="4" rx="0.5" /><rect x="11" y="11" width="4" height="4" rx="0.5" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="1" y="1" width="3" height="3" rx="0.5" /><rect x="5" y="1" width="3" height="3" rx="0.5" /><rect x="9" y="1" width="3" height="3" rx="0.5" /><rect x="13" y="1" width="2" height="3" rx="0.5" />
                        <rect x="1" y="5" width="3" height="3" rx="0.5" /><rect x="5" y="5" width="3" height="3" rx="0.5" /><rect x="9" y="5" width="3" height="3" rx="0.5" /><rect x="13" y="5" width="2" height="3" rx="0.5" />
                        <rect x="1" y="9" width="3" height="3" rx="0.5" /><rect x="5" y="9" width="3" height="3" rx="0.5" /><rect x="9" y="9" width="3" height="3" rx="0.5" /><rect x="13" y="9" width="2" height="3" rx="0.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <FilterContent />
          </div>
        </aside>

        {/* Product grid area */}
        <div class="flex-1 min-w-0">
          {/* Toolbar */}
          <div class="bg-white dark:bg-[#1a1a1a] border-b border-gray-200/60 dark:border-gray-700/40 px-4 md:px-6 py-3 sticky top-[var(--header-h)] z-20">
            <div class="flex items-center justify-between">
              {/* Breadcrumbs */}
              <div class="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto">
                <nav class="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0" aria-label="Breadcrumb">
                  <Link href="/#products" class="hover:text-dark dark:hover:text-white transition-colors">Collections</Link>
                  <svg class="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                  <span class="font-medium text-gray-900 dark:text-white">{c.title}</span>
                </nav>

                {/* Active filter tags (inline with breadcrumbs) */}
                {activeFilterCount.value > 0 && (
                  <div class="hidden md:flex items-center gap-1.5 flex-shrink-0">
                    {selectedBrands.value.map((brand) => (
                      <span key={`brand-${brand}`} class="inline-flex items-center gap-1 text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full pl-2 pr-1 py-0.5">
                        {brand}
                        <button type="button" class="hover:text-red-500 transition-colors bg-transparent border-none p-0 text-gray-400" onClick$={() => { selectedBrands.value = selectedBrands.value.filter((b) => b !== brand); }}>
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                    {selectedTypes.value.map((type) => (
                      <span key={`type-${type}`} class="inline-flex items-center gap-1 text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full pl-2 pr-1 py-0.5">
                        {type}
                        <button type="button" class="bg-transparent border-none p-0 text-gray-400 hover:text-red-500 transition-colors" onClick$={() => { selectedTypes.value = selectedTypes.value.filter((t) => t !== type); }}>
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                    {/* Size chips — commented out for now
                    {selectedSizes.value.map((size) => (
                      <span key={`size-${size}`} class="inline-flex items-center gap-1 text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full pl-2 pr-1 py-0.5">
                        {size}
                        <button type="button" class="bg-transparent border-none p-0 text-gray-400 hover:text-red-500 transition-colors" onClick$={() => { selectedSizes.value = selectedSizes.value.filter((s) => s !== size); }}>
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                    */}
                    {inStockOnly.value && (
                      <span class="inline-flex items-center gap-1 text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full pl-2 pr-1 py-0.5">
                        In Stock
                        <button type="button" class="bg-transparent border-none p-0 text-gray-400 hover:text-red-500 transition-colors" onClick$={() => { inStockOnly.value = false; }}>
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div class="flex items-center gap-3 flex-shrink-0">
                {/* Product count */}
                <span class="hidden md:inline text-xs text-gray-400 dark:text-gray-500">
                  {activeFilterCount.value > 0
                    ? `${filteredProducts.value.length} of ${allProducts.value.length}`
                    : `${allProducts.value.length}`} products
                </span>

                {/* Collection search (desktop) */}
                <div class="hidden md:flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-[#1e1e1e]">
                  <svg class="w-3.5 h-3.5 ml-2.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    class="w-[200px] px-2 py-1.5 text-xs bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    value={collectionSearch.value}
                    onInput$={(_, el) => { collectionSearch.value = el.value; }}
                  />
                  {collectionSearch.value && (
                    <button
                      type="button"
                      class="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none p-0"
                      onClick$={() => { collectionSearch.value = ""; }}
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>

                {/* Mobile grid toggle */}
                <div class="md:hidden flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {([1, 2] as const).map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      class={`p-1.5 transition-colors ${gridCols.value === cols ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-[#1e1e1e] hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                      onClick$={() => { gridCols.value = cols as 1 | 2 | 3 | 4; }}
                    >
                      {cols === 1 ? (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="14" height="6" rx="1" /><rect x="1" y="9" width="14" height="6" rx="1" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
                      )}
                    </button>
                  ))}
                </div>

                {/* Mobile filter button */}
                <button
                  type="button"
                  class="lg:hidden flex items-center gap-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  onClick$={() => { mobileFiltersOpen.value = true; }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                  </svg>
                  Filters
                  {activeFilterCount.value > 0 && (
                    <span class="bg-primary text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none">
                      {activeFilterCount.value}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active filter tags (mobile only — desktop tags are inline with breadcrumbs) */}
            {activeFilterCount.value > 0 && (
              <div class="flex flex-wrap gap-1.5 mt-2.5 md:hidden">
                {selectedBrands.value.map((brand) => (
                  <span key={`brand-${brand}`} class="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full pl-2.5 pr-1.5 py-0.5">
                    {brand}
                    <button type="button" class="hover:text-red-500 transition-colors bg-transparent border-none p-0 text-gray-400" onClick$={() => { selectedBrands.value = selectedBrands.value.filter((b) => b !== brand); }}>
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                {selectedTypes.value.map((type) => (
                  <span key={`type-${type}`} class="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full pl-2.5 pr-1.5 py-0.5">
                    {type}
                    <button type="button" class="bg-transparent border-none p-0 text-gray-400 hover:text-red-500 transition-colors" onClick$={() => { selectedTypes.value = selectedTypes.value.filter((t) => t !== type); }}>
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                {/* Size chips — commented out for now
                {selectedSizes.value.map((size) => (
                  <span key={`size-${size}`} class="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full pl-2.5 pr-1.5 py-0.5">
                    Size: {size}
                    <button type="button" class="bg-transparent border-none p-0 text-gray-400 hover:text-red-500 transition-colors" onClick$={() => { selectedSizes.value = selectedSizes.value.filter((s) => s !== size); }}>
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                */}
                {inStockOnly.value && (
                  <span class="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full pl-2.5 pr-1.5 py-0.5">
                    In Stock
                    <button type="button" class="bg-transparent border-none p-0 text-gray-400 hover:text-red-500 transition-colors" onClick$={() => { inStockOnly.value = false; }}>
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Product grid */}
          <section class="px-3 md:px-5 py-4 md:py-5">
            {displayedProducts.value.length === 0 ? (
              <div class="text-center py-16">
                <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <p class="text-gray-500 dark:text-gray-400 mb-2">
                  {activeFilterCount.value > 0
                    ? "No products match your filters."
                    : "No products in this collection yet."}
                </p>
                {activeFilterCount.value > 0 && (
                  <button
                    type="button"
                    class="text-sm text-primary font-medium hover:underline bg-transparent border-none"
                    onClick$={clearAllFilters}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div class={`grid gap-2 md:gap-3 ${
                gridCols.value === 1
                  ? "grid-cols-1"
                  : gridCols.value === 2
                    ? "grid-cols-2"
                    : gridCols.value === 3
                      ? "grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-2 lg:grid-cols-4"
              }`}>
                {displayedProducts.value.map((product: ShopifyProduct) => (
                  <div
                    key={product.id}
                    class="group bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col cursor-pointer"
                    onClick$={() => openQuickView(product)}
                  >
                    <div class="relative overflow-hidden">
                      {product.featuredImage ? (
                        <img
                          src={product.featuredImage.url}
                          alt={product.featuredImage.altText || product.title}
                          width={400}
                          height={400}
                          class="w-full aspect-square object-cover bg-gray-100 dark:bg-gray-800 transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div class="w-full aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                          No image
                        </div>
                      )}
                      {!product.availableForSale && (
                        <div class="absolute top-2 left-2 bg-gray-900/80 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                          Sold Out
                        </div>
                      )}
                    </div>
                    <div class="p-4 px-5 flex-1 flex flex-col">
                      {product.vendor && (
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          {product.vendor}
                        </span>
                      )}
                      <h3 class="text-[0.95rem] font-semibold mb-1 leading-snug line-clamp-2">
                        {product.title}
                      </h3>
                      <span class="text-base font-bold text-primary mt-auto pt-2">
                        {formatPrice(product.priceRange.minVariantPrice)}
                        {product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount && (
                          <span class="text-gray-400 dark:text-gray-500 font-normal text-xs ml-1">
                            &ndash; {formatPrice(product.priceRange.maxVariantPrice)}
                          </span>
                        )}
                      </span>
                      {getProductColors(product).length > 0 && (
                        <div class="flex flex-wrap gap-1.5 mt-2">
                          {getProductColors(product).map((color) => {
                            const css = getColorCss(color);
                            const isGradient = css.startsWith("linear");
                            return (
                              <span
                                key={color}
                                title={color}
                                class="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600"
                                style={isGradient ? { background: css } : { backgroundColor: css }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More button */}
            {hasMore.value && (
              <div class="flex items-center mt-5">
                <div class="flex-1" />
                <button
                  type="button"
                  class="inline-flex items-center gap-2 py-3 px-8 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick$={loadMore}
                >
                  Load More
                </button>
                <div class="flex-1 text-right">
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    {displayedProducts.value.length} of {filteredProducts.value.length} products
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {mobileFiltersOpen.value && (
        <div class="fixed inset-0 z-50 lg:hidden">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick$={() => { mobileFiltersOpen.value = false; }} />
          <div class="absolute right-0 top-0 bottom-0 w-[320px] max-w-[85vw] bg-white dark:bg-[#161616] shadow-2xl flex flex-col animate-slide-in">
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                </svg>
                <h2 class="text-sm font-semibold">Filters & Sort</h2>
              </div>
              <button
                type="button"
                class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-dark dark:hover:text-white bg-transparent border-none text-xl"
                onClick$={() => { mobileFiltersOpen.value = false; }}
              >
                &times;
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <FilterContent />
            </div>
            <div class="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                class="w-full py-3 px-4 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                onClick$={() => { mobileFiltersOpen.value = false; }}
              >
                Show {filteredProducts.value.length} products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct.value && (() => {
        const qp = quickViewProduct.value!;
        const qImages = qp.images.edges.map((e) => e.node);
        const qVariants = qp.variants.edges.map((e) => e.node);
        const qAnyAvailable = qVariants.some((v: ShopifyVariant) => v.availableForSale);
        const qActiveVariant = qVariants.find((v: ShopifyVariant) => v.id === qvSelectedVariant.value);

        return (
          <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick$={() => { quickViewProduct.value = null; }} />
            <div class="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[min(90dvh,800px)] overflow-y-auto animate-fade-in">
              {/* Close button */}
              <button
                type="button"
                class="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors border-none"
                onClick$={() => { quickViewProduct.value = null; }}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Image */}
                <div class="p-5">
                  {qImages.length > 0 ? (
                    <>
                      <img
                        src={qImages[qvSelectedImage.value]?.url}
                        alt={qImages[qvSelectedImage.value]?.altText || qp.title}
                        class="w-full rounded-xl aspect-square object-cover bg-gray-100 dark:bg-gray-800"
                      />
                      {qImages.length > 1 && (
                        <div class="flex gap-1.5 mt-2 overflow-x-auto">
                          {qImages.map((img, i) => (
                            <button
                              key={img.url}
                              onClick$={() => (qvSelectedImage.value = i)}
                              class={`w-12 h-12 rounded-lg overflow-hidden border-2 p-0 bg-transparent flex-shrink-0 transition-colors ${
                                i === qvSelectedImage.value ? "border-primary" : "border-transparent"
                              }`}
                            >
                              <img src={img.url} alt="" class="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div class="w-full aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm rounded-xl">
                      No image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div class="p-5 pt-3 md:pt-5 flex flex-col">
                  {qp.vendor && (
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                      {qp.vendor}
                    </span>
                  )}
                  <h2 class="text-xl font-extrabold tracking-tight mb-2">{qp.title}</h2>
                  <p class="text-xl font-bold text-primary mb-4">
                    {formatPrice(qp.priceRange.minVariantPrice)}
                    {qp.priceRange.minVariantPrice.amount !== qp.priceRange.maxVariantPrice.amount && (
                      <span class="text-gray-400 font-normal text-sm ml-1">
                        &ndash; {formatPrice(qp.priceRange.maxVariantPrice)}
                      </span>
                    )}
                  </p>

                  {/* Availability */}
                  {qActiveVariant && (
                    <div class="flex items-center gap-2 mb-4">
                      <span class={`w-2 h-2 rounded-full ${qActiveVariant.availableForSale ? "bg-green-600" : "bg-red-600"}`} />
                      <span class={`text-sm font-semibold ${qActiveVariant.availableForSale ? "text-green-600" : "text-red-600"}`}>
                        {qActiveVariant.availableForSale ? "In stock" : "Out of stock"}
                      </span>
                    </div>
                  )}

                  {/* Variant selector */}
                  {qVariants.length > 1 && (
                    <div class="mb-4">
                      <p class="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">Select Option</p>
                      <div class="flex flex-wrap gap-1.5">
                        {qVariants.map((v: ShopifyVariant) => (
                          <button
                            key={v.id}
                            onClick$={() => { if (v.availableForSale) qvSelectedVariant.value = v.id; }}
                            class={`py-1.5 px-3 rounded-full border text-xs font-medium transition-all ${
                              !v.availableForSale
                                ? "opacity-40 cursor-not-allowed line-through border-gray-200 dark:border-gray-700"
                                : v.id === qvSelectedVariant.value
                                  ? "border-primary bg-primary/[0.08] text-primary font-semibold"
                                  : "border-gray-200 dark:border-gray-700"
                            }`}
                            disabled={!v.availableForSale}
                          >
                            {v.title} &middot; {formatPrice(v.price)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add to cart */}
                  <button
                    class={`w-full py-3 px-6 text-sm font-semibold rounded-lg border-none transition-all mb-3 ${
                      qAnyAvailable
                        ? "bg-primary text-white hover:bg-primary-dark"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick$={qvAddToCart}
                    disabled={!qAnyAvailable || qvAdding.value}
                  >
                    {qvAdding.value ? "Adding..." : qvAdded.value ? "Added to Cart!" : qAnyAvailable ? "Add to Cart" : "Sold Out"}
                  </button>

                  {/* Description */}
                  {qp.description && (
                    <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{qp.description}</p>
                  )}

                  {/* Full details link */}
                  <Link
                    href={`/product/${qp.handle}/?collection=${c.handle}`}
                    class="text-sm font-medium text-primary hover:underline mt-auto"
                  >
                    View Full Details &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const collection = resolveValue(useCollection);
  const heroImg = collection?.image?.url;
  return {
    title: collection
      ? `${collection.title} | The Safety House`
      : "Collection Not Found | The Safety House",
    meta: [
      {
        name: "description",
        content: collection?.description || "Browse our collection",
      },
    ],
    links: heroImg
      ? [{ rel: "preload", as: "image", href: heroImg }]
      : [],
  };
};
