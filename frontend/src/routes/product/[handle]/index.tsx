import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import { routeLoader$, Link } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import {
  getProductByHandle,
  getCollectionByHandle,
  getProductRecommendations,
  formatPrice,
  createCart,
  addToCart,
} from "~/lib/medusa";
import type { ShopifyVariant } from "~/lib/medusa";
import { getColorCss } from "~/lib/colors";

export const useProduct = routeLoader$(async (requestEvent) => {
  const handle = requestEvent.params.handle;
  const collectionHandle = requestEvent.url.searchParams.get("collection");

  let product, collection;
  try {
    [product, collection] = await Promise.all([
      getProductByHandle(handle),
      collectionHandle
        ? getCollectionByHandle(collectionHandle)
        : Promise.resolve(null),
    ]);
  } catch (err) {
    console.error(`Product load failed for ${handle}:`, err);
    requestEvent.status(500);
    return null;
  }

  if (!product) {
    requestEvent.status(404);
    return null;
  }

  // Get related products from the same collection/category
  let related = collection
    ? collection.products.edges
        .map((e) => e.node)
        .filter((p) => p.handle !== handle)
    : [];

  // Fallback: use generic recommendations if no collection context
  if (related.length === 0) {
    related = await getProductRecommendations(product.id);
  }

  // Cache at Vercel edge for 5 min, serve stale up to 1 hour while revalidating
  requestEvent.headers.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=3600",
  );

  return {
    ...product,
    _collection: collection
      ? { handle: collection.handle, title: collection.title }
      : null,
    _related: related.slice(0, 10),
  };
});

export default component$(() => {
  const product = useProduct();
  const selectedImage = useSignal(0);
  const selectedVariantId = useSignal("");
  const adding = useSignal(false);
  const added = useSignal(false);
  const cartCount = useSignal(0);

  // Load cart count from localStorage on mount
  useVisibleTask$(() => {
    const count = localStorage.getItem("cart_count");
    if (count) cartCount.value = parseInt(count, 10);
  });

  // Set default selected variant
  useVisibleTask$(({ track }) => {
    track(() => product.value);
    if (product.value) {
      const variants = product.value.variants.edges.map((e) => e.node);
      const available = variants.find((v) => v.availableForSale);
      if (available) {
        selectedVariantId.value = available.id;
      }
    }
  });

  const handleAddToCart = $(async () => {
    if (!selectedVariantId.value || adding.value) return;

    adding.value = true;
    added.value = false;

    try {
      const cartId = localStorage.getItem("cart_id");

      let cart;
      if (cartId) {
        cart = await addToCart(cartId, selectedVariantId.value, 1);
      } else {
        cart = await createCart(selectedVariantId.value, 1);
      }

      localStorage.setItem("cart_id", cart.id);
      localStorage.setItem("cart_checkout_url", cart.checkoutUrl);
      localStorage.setItem("cart_count", String(cart.totalQuantity));
      cartCount.value = cart.totalQuantity;
      added.value = true;

      setTimeout(() => (added.value = false), 2500);
    } catch (err) {
      console.error("Add to cart failed:", err);
    } finally {
      adding.value = false;
    }
  });

  if (!product.value) {
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

  const p = product.value;
  const images = p.images.edges.map((e) => e.node);
  const variants = p.variants.edges.map((e) => e.node);
  const anyAvailable = variants.some((v) => v.availableForSale);

  const getStockLabel = (variant: ShopifyVariant) => {
    return variant.availableForSale ? "In stock" : "Out of stock";
  };

  // Find the currently selected variant for stock display
  const activeVariant = variants.find((v) => v.id === selectedVariantId.value);

  const col = p._collection;

  // Extract color option values
  const colorOption = p.options.find((o) => o.name === "Color");
  const colors = colorOption?.values ?? (p.meta?.color ? [p.meta.color] : []);


  // Find the active color from selected variant
  const activeColor = activeVariant
    ? colors.find((c) => activeVariant.title.toLowerCase().includes(c.toLowerCase()))
    : colors[0];

  // Select first variant matching a color + switch to matching image
  const selectColor = $((color: string) => {
    const match = variants.find(
      (v) => v.availableForSale && v.title.toLowerCase().includes(color.toLowerCase())
    );
    if (match) selectedVariantId.value = match.id;

    // Switch to color-specific image if available
    const colorImageUrl = p.meta?.color_images?.[color];
    if (colorImageUrl) {
      const idx = images.findIndex((img) => img.url === colorImageUrl);
      if (idx >= 0) {
        selectedImage.value = idx;
      }
    }
  });

  return (
    <div class="px-5 md:px-8 py-6 md:py-12">
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
                  {col.title}
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
            // Strip all color values from label to show just the size
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
              disabled={!anyAvailable || adding.value}
            >
              {adding.value
                ? "Adding..."
                : added.value
                  ? "Added to Cart!"
                  : anyAvailable
                    ? "Add to Cart"
                    : "Sold Out"}
            </button>

            {cartCount.value > 0 && (
              <a
                href={
                  typeof window !== "undefined"
                    ? localStorage.getItem("cart_checkout_url") || "#"
                    : "#"
                }
                class="inline-flex items-center justify-center py-3 px-7 text-[0.9rem] font-semibold rounded-lg border-none transition-all duration-200 bg-dark text-white hover:bg-dark-soft hover:-translate-y-0.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                Checkout ({cartCount.value})
              </a>
            )}
          </div>

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
                href={`/product/${item.handle}/${col ? `?collection=${col.handle}` : ""}`}
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
                    <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(156,163,175,0.12)" stroke-width="1" stroke-dasharray="4 3" stroke-linecap="round" />
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
