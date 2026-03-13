import { component$, useSignal, useResource$, Resource, $, useVisibleTask$ } from "@builder.io/qwik";
import { routeLoader$, Link, useLocation } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import {
  getProductByHandle,
  getCollectionByHandle,
  getProductRecommendations,
  formatPrice,
} from "~/lib/medusa";
import type { ShopifyVariant, ShopifyProduct } from "~/lib/medusa";
import { getColorCss } from "~/lib/colors";

// routeLoader$ only runs on SSR — provides data for initial HTML + SEO
export const useProduct = routeLoader$(async (requestEvent) => {
  const handle = requestEvent.params.handle;
  const collectionHandle = requestEvent.url.searchParams.get("collection");

  let product;
  try {
    product = await getProductByHandle(handle);
  } catch (err) {
    console.error(`Product load failed for ${handle}:`, err);
    requestEvent.status(500);
    return null;
  }

  if (!product) {
    requestEvent.status(404);
    return null;
  }

  // Load related products in parallel (non-blocking for client nav)
  let related: ShopifyProduct[] = [];
  try {
    if (collectionHandle) {
      const collection = await getCollectionByHandle(collectionHandle);
      if (collection) {
        related = collection.products.edges
          .map((e) => e.node)
          .filter((p) => p.handle !== handle);
      }
    }
    if (related.length === 0) {
      related = await getProductRecommendations(product.id);
    }
  } catch {
    // Related products are non-critical
  }

  requestEvent.headers.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=3600",
  );

  return {
    ...product,
    _collection: collectionHandle
      ? { handle: collectionHandle, title: "" }
      : null,
    _related: related.slice(0, 10),
  };
});

// Skeleton shown during client-side navigation while product loads
const ProductSkeleton = component$(() => (
  <div class="px-5 md:px-8 py-6 md:py-12 animate-pulse relative">
    <div class="stitch-v-seams stitch-dark" />
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
      <div>
        <div class="w-full aspect-square rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div class="flex gap-2 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} class="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
      <div>
        <div class="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
        <div class="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
        <div class="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
        <div class="flex gap-2 mb-5">
          {[1, 2, 3].map((i) => (
            <div key={i} class="w-8 h-8 rounded-sm bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        <div class="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} class="h-9 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        <div class="h-12 w-44 rounded-lg bg-gray-200 dark:bg-gray-800 mb-6" />
        <div class="space-y-2">
          <div class="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
          <div class="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
          <div class="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
    </div>
  </div>
));

// Full product detail component
const ProductDetail = component$<{
  p: ShopifyProduct & {
    _collection: { handle: string; title: string } | null;
    _related: ShopifyProduct[];
  };
}>(({ p }) => {
  const selectedImage = useSignal(0);
  const selectedVariantId = useSignal("");
  useVisibleTask$(({ track }) => {
    track(() => p);
    const variants = p.variants.edges.map((e) => e.node);
    const available = variants.find((v) => v.availableForSale);
    if (available) selectedVariantId.value = available.id;
    selectedImage.value = 0;
  });

  const showComingSoon = useSignal(false);

  const handleAddToCart = $(() => {
    showComingSoon.value = true;
    setTimeout(() => { showComingSoon.value = false; }, 3000);
  });

  const images = p.images.edges.map((e) => e.node);
  const variants = p.variants.edges.map((e) => e.node);
  const anyAvailable = variants.some((v) => v.availableForSale);

  const getStockLabel = (variant: ShopifyVariant) => {
    return variant.availableForSale ? "In stock" : "Out of stock";
  };

  const activeVariant = variants.find((v) => v.id === selectedVariantId.value);
  const col = p._collection;

  const colorOption = p.options.find((o) => o.name === "Color");
  const colors = colorOption?.values ?? (p.meta?.color ? [p.meta.color] : []);

  const activeColor = activeVariant
    ? colors.find((c) => activeVariant.title.toLowerCase().includes(c.toLowerCase()))
    : colors[0];

  const selectColor = $((color: string) => {
    const match = variants.find(
      (v) => v.availableForSale && v.title.toLowerCase().includes(color.toLowerCase())
    );
    if (match) selectedVariantId.value = match.id;
    const colorImageUrl = p.meta?.color_images?.[color];
    if (colorImageUrl) {
      const idx = images.findIndex((img) => img.url === colorImageUrl);
      if (idx >= 0) selectedImage.value = idx;
    }
  });

  return (
    <div class="px-5 md:px-8 py-6 md:py-12 relative">
      <div class="stitch-v-seams stitch-dark" />
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Images */}
        <div>
          {images.length > 0 ? (
            <>
              <img
                src={images[selectedImage.value]?.url}
                alt={images[selectedImage.value]?.altText || p.title}
                class="w-full rounded-xl aspect-square object-cover border border-warm"
              />
              {images.length > 1 && (
                <div class="flex gap-2 mt-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={img.url}
                      onClick$={() => (selectedImage.value = i)}
                      class={`w-16 h-16 rounded-lg overflow-hidden border-2 p-0 bg-transparent flex-shrink-0 transition-colors ${
                        i === selectedImage.value
                          ? "border-primary"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.altText || `${p.title} ${i + 1}`}
                        class="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div class="w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm aspect-square rounded-xl">
              No image
            </div>
          )}
          <nav class="hidden md:flex items-center gap-1.5 text-sm mt-4" aria-label="Breadcrumb">
            <Link href="/" class="text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition-colors">
              Home
            </Link>
            {col && (
              <>
                <span class="text-gray-400 dark:text-gray-500">/</span>
                <Link href={`/collections/${col.handle}/`} class="text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition-colors">
                  {col.title || col.handle.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Product Info */}
        <div>
          {p.vendor && (
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 block">
              {p.vendor}
            </span>
          )}
          <h1 class="text-[1.75rem] font-extrabold tracking-tight mb-3">
            {p.title}
          </h1>

          {/* Tags / Badges */}
          {p.meta?.tags && p.meta.tags.length > 0 && (
            <div class="flex flex-wrap gap-1.5 mb-4">
              {p.meta.tags.map((tag) => (
                <span
                  key={tag}
                  class="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-warm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p class="text-2xl font-bold text-primary mb-6">
            {activeVariant
              ? formatPrice(activeVariant.price)
              : formatPrice(p.priceRange.minVariantPrice)}
          </p>

          {/* Color Swatches */}
          {colors.length > 0 && (
            <div class="mb-5">
              <p class="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-2">
                Color{activeColor ? ` — ${activeColor}` : ""}
              </p>
              <div class="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const css = getColorCss(color);
                  const isGradient = css.startsWith("linear");
                  const isActive = activeColor?.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick$={() => selectColor(color)}
                      class={`w-8 h-8 rounded-sm border-2 transition-all duration-150 ${
                        isActive
                          ? "border-gray-900 dark:border-white scale-110 shadow-md"
                          : "border-warm-strong hover:border-warm-strong"
                      }`}
                      style={isGradient ? { background: css } : { backgroundColor: css }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Availability Indicator */}
          {activeVariant && (
            <div class="flex items-center gap-2 mb-6">
              <span
                class={`w-2 h-2 rounded-full inline-block ${
                  activeVariant.availableForSale
                    ? "bg-green-600"
                    : "bg-red-600"
                }`}
              />
              <span
                class={`text-sm font-semibold ${
                  activeVariant.availableForSale
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {getStockLabel(activeVariant)}
              </span>
            </div>
          )}

          {/* Variant Selector — filtered by active color */}
          {variants.length > 1 && (() => {
            const filtered = activeColor
              ? variants.filter((v) => v.title.toLowerCase().includes(activeColor.toLowerCase()))
              : variants;
            const colorSet = new Set(colors.map((c) => c.toLowerCase().trim()));
            const stripColors = (title: string) => {
              const parts = title.split(/\s*\/\s*/);
              const sizeOnly = parts.filter((part) => !colorSet.has(part.toLowerCase().trim()));
              return sizeOnly.join(" / ") || title;
            };
            return filtered.length > 0 ? (
              <div class="mb-6">
                <p class="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold mb-2">
                  Size
                </p>
                <div class="flex flex-wrap gap-2">
                  {filtered.map((v) => (
                    <button
                      key={v.id}
                      onClick$={() => {
                        if (v.availableForSale) selectedVariantId.value = v.id;
                      }}
                      class={`py-1.5 px-3.5 rounded-full border text-xs font-medium transition-all duration-200 ${
                        !v.availableForSale
                          ? "opacity-40 cursor-not-allowed line-through border-warm"
                          : v.id === selectedVariantId.value
                            ? "border-primary bg-primary/[0.08] text-primary font-semibold"
                            : "border-warm"
                      }`}
                      disabled={!v.availableForSale}
                    >
                      {stripColors(v.title)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Add to Cart */}
          <div class="flex gap-3 items-center mb-6">
            <button
              class={`inline-flex items-center justify-center py-3.5 px-8 text-base font-semibold rounded-lg border-none transition-all duration-200 min-w-[180px] ${
                anyAvailable
                  ? "bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              onClick$={handleAddToCart}
              disabled={!anyAvailable}
            >
              {anyAvailable ? "Add to Cart" : "Sold Out"}
            </button>
          </div>

          {/* Coming soon modal */}
          {showComingSoon.value && (
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick$={() => { showComingSoon.value = false; }}>
              <div class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-2xl p-8 mx-4 max-w-sm text-center stitch-box-overlay" onClick$={(e: Event) => e.stopPropagation()}>
                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <h3 class="text-lg font-bold text-dark dark:text-white mb-2">Coming Soon</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">Stripe checkout integration coming soon.</p>
                <div class="flex gap-3 justify-center">
                  <a href="tel:613-224-6804" class="inline-flex items-center gap-1.5 py-2.5 px-5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors">
                    Call Us
                  </a>
                  <button type="button" onClick$={() => { showComingSoon.value = false; }} class="py-2.5 px-5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Description & Details */}
          {(p.description || p.meta?.features) && (
            <div class="relative pt-6 mt-2 space-y-5 stitch-line-h stitch-dark">
              {p.description && (
                <p class="text-[#444] dark:text-gray-300 leading-relaxed text-[0.925rem]">{p.description}</p>
              )}

              {/* Features */}
              {p.meta?.features && (
                <div>
                  <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Features</h3>
                  <ul class="space-y-1.5 text-sm text-[#444] dark:text-gray-300">
                    {p.meta.features.split("•").filter(Boolean).map((f, i) => (
                      <li key={i} class="flex gap-2">
                        <span class="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{f.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specs */}
              {(p.meta?.fabric || p.meta?.fit || p.meta?.origin || p.meta?.material_number) && (
                <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {p.meta?.material_number && (
                    <>
                      <span class="text-gray-500 dark:text-gray-400">SKU</span>
                      <span class="text-gray-900 dark:text-white font-mono text-xs">{p.meta.material_number}</span>
                    </>
                  )}
                  {p.meta?.fabric && (
                    <>
                      <span class="text-gray-500 dark:text-gray-400">Material</span>
                      <span class="text-gray-900 dark:text-white">{p.meta.fabric}</span>
                    </>
                  )}
                  {p.meta.fit && (
                    <>
                      <span class="text-gray-500 dark:text-gray-400">Fit</span>
                      <span class="text-gray-900 dark:text-white">{p.meta.fit}</span>
                    </>
                  )}
                  {p.meta.origin && (
                    <>
                      <span class="text-gray-500 dark:text-gray-400">Origin</span>
                      <span class="text-gray-900 dark:text-white">{p.meta.origin}</span>
                    </>
                  )}
                  {p.meta.fr && (
                    <>
                      <span class="text-gray-500 dark:text-gray-400">FR Rated</span>
                      <span class="text-green-600 font-semibold">Yes</span>
                    </>
                  )}
                  {p.meta.hi_vis && (
                    <>
                      <span class="text-gray-500 dark:text-gray-400">Hi-Vis</span>
                      <span class="text-green-600 font-semibold">Yes</span>
                    </>
                  )}
                </div>
              )}

              {/* Care Instructions */}
              {p.meta?.care_instructions && (() => {
                const instructions = p.meta.care_instructions.split(",").map((s: string) => s.trim()).filter(Boolean);
                return (
                  <div>
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2.5">Care</h3>
                    <ul class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {instructions.map((inst: string, i: number) => {
                        const lower = inst.toLowerCase();
                        let icon: string;
                        if (lower.includes("machine wash") || lower.includes("wash")) {
                          icon = `<path d="M3 6h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/><path d="M3 6l3-3h12l3 3"/><path d="M8 14a4 4 0 0 0 8 0" fill="none"/>`;
                        } else if (lower.includes("bleach") && lower.includes("not")) {
                          icon = `<polygon points="12,3 2,21 22,21"/><line x1="4" y1="4" x2="20" y2="20"/>`;
                        } else if (lower.includes("bleach")) {
                          icon = `<polygon points="12,3 2,21 22,21"/>`;
                        } else if (lower.includes("tumble dry")) {
                          icon = `<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="12" r="5" fill="none"/>`;
                        } else if (lower.includes("iron") && lower.includes("not")) {
                          icon = `<path d="M3 17h14l3-7H8l-1 3H3z"/><circle cx="10" cy="10" r="1"/><line x1="4" y1="4" x2="20" y2="20"/>`;
                        } else if (lower.includes("iron")) {
                          icon = `<path d="M3 17h14l3-7H8l-1 3H3z"/><circle cx="10" cy="10" r="1"/>`;
                        } else if (lower.includes("dry clean") && lower.includes("not")) {
                          icon = `<circle cx="12" cy="12" r="9" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">P</text><line x1="4" y1="4" x2="20" y2="20"/>`;
                        } else if (lower.includes("dry clean")) {
                          icon = `<circle cx="12" cy="12" r="9" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">P</text>`;
                        } else if (lower.includes("fabric softener")) {
                          icon = `<path d="M8 2v4l4 3 4-3V2"/><path d="M12 9v11"/><path d="M7 20h10"/>`;
                        } else if (lower.includes("starch") && lower.includes("not")) {
                          icon = `<rect x="5" y="5" width="14" height="14" rx="1" fill="none"/><line x1="4" y1="4" x2="20" y2="20"/>`;
                        } else if (lower.includes("like color")) {
                          icon = `<circle cx="9" cy="12" r="5" fill="none"/><circle cx="15" cy="12" r="5" fill="none"/>`;
                        } else {
                          icon = `<circle cx="12" cy="12" r="9" fill="none"/><circle cx="12" cy="12" r="1"/>`;
                        }
                        return (
                          <li key={i} class="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                            <svg class="w-5 h-5 flex-shrink-0 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML={icon} />
                            <span>{inst}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {p._related && p._related.length > 0 && (
        <div class="relative mt-12 pt-8 stitch-line-h stitch-dark">
          <h2 class="text-xl font-bold mb-5">You May Also Like</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {p._related.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={`/product/${item.handle}/${p._collection ? `?collection=${p._collection.handle}` : ""}`}
                class="group block bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden border border-warm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                {item.featuredImage ? (
                  <img
                    src={item.featuredImage.url}
                    alt={item.featuredImage.altText || item.title}
                    width={300}
                    height={300}
                    class="w-full aspect-square object-cover bg-gray-100 dark:bg-gray-800 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div class="w-full aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                    No image
                  </div>
                )}
                {/* Stitch seam */}
                <div class="relative h-0">
                  <svg class="absolute left-0 right-0 -top-px w-full h-px overflow-visible pointer-events-none" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(156,163,175,0.22)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                  </svg>
                </div>
                <div class="p-3">
                  {item.vendor && (
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5 block">
                      {item.vendor}
                    </span>
                  )}
                  <h3 class="text-sm font-semibold leading-snug line-clamp-2 mb-1">
                    {item.title}
                  </h3>
                  <span class="text-sm font-bold text-primary">
                    {formatPrice(item.priceRange.minVariantPrice)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default component$(() => {
  const ssrProduct = useProduct();
  const loc = useLocation();

  // useResource$ resolves on SSR (for SEO) but shows loading state on client-side nav
  const productResource = useResource$(async ({ track }) => {
    const handle = track(() => loc.params.handle);
    const collectionHandle = track(() => loc.url.searchParams.get("collection"));

    // On SSR, use the routeLoader data directly (already fetched)
    if (ssrProduct.value && ssrProduct.value.handle === handle) {
      return ssrProduct.value;
    }

    // Client-side navigation — fetch the product (usually cached on server)
    const product = await getProductByHandle(handle);
    if (!product) return null;

    // Fetch related products in background
    let related: ShopifyProduct[] = [];
    try {
      if (collectionHandle) {
        const collection = await getCollectionByHandle(collectionHandle);
        if (collection) {
          related = collection.products.edges
            .map((e) => e.node)
            .filter((p) => p.handle !== handle);
        }
      }
      if (related.length === 0) {
        related = await getProductRecommendations(product.id);
      }
    } catch {
      // non-critical
    }

    return {
      ...product,
      _collection: collectionHandle
        ? { handle: collectionHandle, title: "" }
        : null,
      _related: related.slice(0, 10),
    };
  });

  return (
    <Resource
      value={productResource}
      onPending={() => <ProductSkeleton />}
      onResolved={(p) => {
        if (!p) {
          return (
            <div class="text-center py-24 px-8">
              <h1 class="text-2xl font-bold mb-4">Product not found</h1>
              <Link
                href="/"
                class="inline-flex items-center justify-center py-3 px-7 text-[0.9rem] font-semibold rounded-lg border-none transition-all duration-200 bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-lg"
              >
                Back to Shop
              </Link>
            </div>
          );
        }
        return <ProductDetail p={p as any} />;
      }}
    />
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const product = resolveValue(useProduct);
  return {
    title: product
      ? `${product.title} | The Safety House`
      : "Product Not Found | The Safety House",
    meta: [
      {
        name: "description",
        content: product?.description || "Product page",
      },
    ],
  };
};
