import { component$, Slot, useSignal, useVisibleTask$, useTask$, $, useOnDocument } from "@builder.io/qwik";
import { isServer } from "@builder.io/qwik/build";
import { Link, useLocation, routeLoader$ } from "@builder.io/qwik-city";
import { Modal } from "@qwik-ui/headless";
import { getCart, removeFromCart, updateCartLines, formatPrice, predictiveSearch, warmCollectionCache } from "~/lib/medusa";
import type { ShopifyCart, ShopifyProduct } from "~/lib/medusa";

// Warm the collection cache on the first server request
export const useWarmCache = routeLoader$(() => {
  warmCollectionCache();
  return null;
});

export default component$(() => {
  useWarmCache();
  const loc = useLocation();
  const darkMode = useSignal(false);
  const cartCount = useSignal(0);
  const cartOpen = useSignal(false);
  const cartData = useSignal<ShopifyCart | null>(null);
  const cartLoading = useSignal(false);

  useVisibleTask$(() => {
    // Measure header and set CSS variable for sticky offsets
    const header = document.getElementById("site-header");
    if (header) {
      const h = header.offsetHeight;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    }

    // Sync signal with current state (inline script in <head> already applied the class)
    darkMode.value = document.documentElement.classList.contains("dark");
    // Load cart count
    const count = localStorage.getItem("cart_count");
    if (count) cartCount.value = parseInt(count, 10);

    // Listen for cart updates from product pages
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart_count" && e.newValue) {
        cartCount.value = parseInt(e.newValue, 10);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  });

  // Fetch cart data from Shopify when drawer opens
  useTask$(async ({ track }) => {
    const isOpen = track(() => cartOpen.value);
    if (isServer || !isOpen) return;

    const cartId = localStorage.getItem("cart_id");
    if (!cartId) return;

    cartLoading.value = true;
    try {
      const cart = await getCart(cartId);
      cartData.value = cart;
      if (cart) {
        cartCount.value = cart.totalQuantity;
        localStorage.setItem("cart_count", String(cart.totalQuantity));
      }
    } catch (err) {
      console.error("Failed to load cart:", err);
    } finally {
      cartLoading.value = false;
    }
  });

  const removeLineItem = $(async (lineId: string) => {
    const cartId = localStorage.getItem("cart_id");
    if (!cartId) return;
    try {
      const cart = await removeFromCart(cartId, [lineId]);
      cartData.value = cart;
      cartCount.value = cart.totalQuantity;
      localStorage.setItem("cart_count", String(cart.totalQuantity));
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  });

  const updateLineQuantity = $(async (lineId: string, quantity: number) => {
    const cartId = localStorage.getItem("cart_id");
    if (!cartId) return;
    try {
      let cart;
      if (quantity <= 0) {
        cart = await removeFromCart(cartId, [lineId]);
      } else {
        cart = await updateCartLines(cartId, [{ id: lineId, quantity }]);
      }
      cartData.value = cart;
      cartCount.value = cart.totalQuantity;
      localStorage.setItem("cart_count", String(cart.totalQuantity));
    } catch (err) {
      console.error("Failed to update quantity:", err);
    }
  });

  // Search
  const searchQuery = useSignal("");
  const searchResults = useSignal<ShopifyProduct[]>([]);
  const searchOpen = useSignal(false);
  const searchExpanded = useSignal(false);
  const searchLoading = useSignal(false);
  const searchTimeout = useSignal<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = $((query: string) => {
    if (searchTimeout.value) clearTimeout(searchTimeout.value);
    if (!query.trim()) {
      searchResults.value = [];
      searchOpen.value = false;
      return;
    }
    searchLoading.value = true;
    searchOpen.value = true;
    searchTimeout.value = setTimeout(async () => {
      try {
        const results = await predictiveSearch(query.trim());
        searchResults.value = results;
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        searchLoading.value = false;
      }
    }, 300);
  });

  const toggleDarkMode = $(() => {
    const isDark = document.documentElement.classList.toggle("dark");
    darkMode.value = isDark;
    localStorage.setItem("darkMode", String(isDark));
  });

  // Click-outside to close search dropdown
  useOnDocument(
    "click",
    $((e: Event) => {
      if (!searchOpen.value) return;
      const target = e.target as HTMLElement;
      if (!target.closest("[data-search-container]")) {
        searchOpen.value = false;
        if (!searchQuery.value.trim()) searchExpanded.value = false;
      }
    }),
  );

  return (
    <div class="min-h-screen bg-gray-100 dark:bg-black">
    <div class="bg-white dark:bg-[#121212] max-w-site mx-auto relative">
      {/* Vertical stitch seams along container edges */}
      <svg class="absolute left-0 top-0 bottom-0 w-px h-full pointer-events-none z-[101] hidden xl:block overflow-visible" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="-8" x2="0" y2="100%" stroke="rgba(0,0,0,0.12)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      </svg>
      <svg class="absolute right-0 top-0 bottom-0 w-px h-full pointer-events-none z-[101] hidden xl:block overflow-visible" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="-8" x2="0" y2="100%" stroke="rgba(0,0,0,0.12)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      </svg>
      {/* Announcement Bar */}
      <div class="bg-dark text-white py-1 px-2 md:px-4 text-[clamp(0.6rem,0.8vw,0.8rem)] font-medium tracking-wider overflow-hidden relative stitch-line-h-bottom stitch-light">
        <div class="stitch-v-seams stitch-light" />
        <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='7' viewBox='0 0 7 7'%3E%3Cline x1='0' y1='7' x2='7' y2='0' stroke='%23ffffff' stroke-opacity='0.06' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3Cline x1='0' y1='0' x2='7' y2='7' stroke='%23ffffff' stroke-opacity='0.06' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3C/svg%3E")` }} />
        <div class="flex items-center justify-between relative">
          <div class="overflow-hidden flex-1 mr-4">
            <div class="announcement-scroll flex whitespace-nowrap">
              <span class="inline-block px-8">
                <span class="text-primary font-bold">WE ARE OPEN</span> &mdash; 595 West Hunt Club Road, Nepean, ON &bull; Mon-Sat &bull; 613-224-6804
              </span>
              <span class="inline-block px-8">
                <span class="text-primary font-bold">SALE</span> &mdash; Save 25% on all ______ products &bull; Use code <span class="text-primary font-bold">SALE25</span>
              </span>
              <span class="inline-block px-8">
                <span class="text-primary font-bold">WE ARE OPEN</span> &mdash; 595 West Hunt Club Road, Nepean, ON &bull; Mon-Sat &bull; 613-224-6804
              </span>
              <span class="inline-block px-8">
                <span class="text-primary font-bold">SALE</span> &mdash; Save 25% on all ______ products &bull; Use code <span class="text-primary font-bold">SALE25</span>
              </span>
            </div>
          </div>
          <nav class="hidden md:flex items-center gap-5 flex-shrink-0">
            <Link href="/about/" class="text-[0.8rem] font-semibold text-white/60 hover:text-primary transition-colors">ABOUT</Link>
            <Link href="/faq/" class="text-[0.8rem] font-semibold text-white/60 hover:text-primary transition-colors">FAQ</Link>
            <Link href="/contact/" class="text-[0.8rem] font-semibold text-white/60 hover:text-primary transition-colors">CONTACT</Link>
          </nav>
        </div>
      </div>

      {/* Header */}
      <header id="site-header" class="bg-white dark:bg-[#1e1e1e] sticky top-0 z-[100] shadow-sm pl-2 pr-2 md:px-4 stitch-line-h-bottom stitch-dark">
        <div class="stitch-v-seams stitch-dark" />
        <div class="py-1 md:py-0 flex items-center justify-between">
          <Link href="/" class="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <img
              src="/logo.png"
              alt="The Safety House"
              width="210"
              height="60"
              class="object-contain w-[190px] md:w-[250px] dark:invert"
            />
            <img
              src="/flag.webp"
              alt=""
              width="32"
              height="32"
              class="w-8 h-8 md:w-9 md:h-9 object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav class="hidden md:flex items-center gap-px">
            {[
              { href: "/collections/work-wear/", handle: "work-wear", label: "Work Wear" },
              { href: "/collections/safety-footwear/", handle: "safety-footwear", label: "Safety Footwear" },
              { href: "/collections/flame-resistant/", handle: "flame-resistant", label: "Flame Resistant" },
              { href: "/collections/safety-supplies/", handle: "safety-supplies", label: "Safety Supplies" },
              { href: "/collections/casual-wear/", handle: "casual-wear", label: "Casual Wear" },
            ].map((item) => {
              const isActive = loc.url.pathname === item.href
                || loc.url.pathname.startsWith(`/collections/${item.handle}/`)
                || loc.url.searchParams.get("collection") === item.handle;
              return (
                <Link key={item.handle} href={item.href} class={`nav-link pattern-stripes nav-stitch-box ${isActive ? "nav-link-active" : ""}`}>{item.label}</Link>
              );
            })}
          </nav>

          <div class="flex items-center gap-1">
            {/* Desktop search */}
            <div class="hidden md:block relative" data-search-container>
              {searchExpanded.value ? (
                <div class="relative flex items-center stitch-box-overlay-dark rounded-none overflow-hidden bg-white dark:bg-[#1e1e1e] animate-fade-in">
                  <svg class="w-4 h-4 ml-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    class="w-[180px] px-2 py-2 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    value={searchQuery.value}
                    autoFocus
                    onInput$={(_, el) => {
                      searchQuery.value = el.value;
                      doSearch(el.value);
                    }}
                    onFocus$={() => {
                      if (searchQuery.value.trim()) searchOpen.value = true;
                    }}
                    onBlur$={() => {
                      if (!searchQuery.value.trim()) {
                        searchExpanded.value = false;
                      }
                    }}
                    onKeyDown$={(e) => {
                      if (e.key === "Escape") {
                        searchQuery.value = "";
                        searchOpen.value = false;
                        searchExpanded.value = false;
                      }
                      if (e.key === "Enter" && searchQuery.value.trim()) {
                        searchOpen.value = false;
                        searchExpanded.value = false;
                        window.location.href = `/search/?q=${encodeURIComponent(searchQuery.value.trim())}`;
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  class="relative flex items-center justify-center px-2.5 py-[0.45rem] stitch-box-overlay-dark rounded-none bg-white dark:bg-[#1e1e1e] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick$={() => { searchExpanded.value = true; }}
                >
                  <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
              )}
              {searchOpen.value && (
                <div class="absolute top-full right-0 mt-1 w-[360px] bg-white dark:bg-[#1e1e1e] border border-warm rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
                  {searchLoading.value ? (
                    <div class="flex items-center justify-center py-6">
                      <div class="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : searchResults.value.length === 0 ? (
                    <p class="text-sm text-gray-500 text-center py-6">No results found</p>
                  ) : (
                    <>
                      {searchResults.value.map((product) => (
                        <a
                          key={product.id}
                          href={`/product/${product.handle}/`}
                          class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          onClick$={() => { searchOpen.value = false; }}
                        >
                          {product.featuredImage ? (
                            <img src={product.featuredImage.url} alt="" width={40} height={40} class="w-10 h-10 rounded-md object-cover bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                          ) : (
                            <div class="w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                          )}
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">{product.title}</p>
                            <p class="text-xs text-primary font-semibold">{formatPrice(product.priceRange.minVariantPrice)}</p>
                          </div>
                        </a>
                      ))}
                      <a
                        href={`/search/?q=${encodeURIComponent(searchQuery.value.trim())}`}
                        class="block text-center text-sm text-primary font-medium py-3 border-t border-warm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick$={() => { searchOpen.value = false; }}
                      >
                        View all results
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile search icon */}
            <a
              href="/search/"
              class="md:hidden relative flex items-center justify-center px-2.5 py-[0.45rem] stitch-box-overlay-dark rounded-none text-gray-600 dark:text-gray-300 hover:text-dark dark:hover:text-white transition-colors"
              aria-label="Search"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </a>

            {/* Cart button + drawer */}
            <Modal.Root bind:show={cartOpen}>
              <Modal.Trigger
                class="relative flex items-center justify-center px-2.5 py-[0.45rem] stitch-box-overlay-dark rounded-none bg-transparent text-gray-600 dark:text-gray-300 hover:text-dark dark:hover:text-white transition-colors"
                aria-label="Open cart"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {cartCount.value > 0 && (
                  <span class="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none">
                    {cartCount.value}
                  </span>
                )}
              </Modal.Trigger>
              <Modal.Panel class="cart-sheet">
                <div class="flex items-center justify-between p-4 border-b border-warm">
                  <h2 class="text-lg font-bold">Your Cart</h2>
                  <Modal.Close class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-dark dark:hover:text-white bg-transparent border-none text-xl">
                    &times;
                  </Modal.Close>
                </div>

                <div class="flex-1 overflow-y-auto p-4">
                  {cartLoading.value ? (
                    <div class="flex items-center justify-center py-12">
                      <div class="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : !cartData.value || cartData.value.lines.edges.length === 0 ? (
                    <div class="text-center py-12">
                      <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                      <p class="text-gray-500 dark:text-gray-400 text-sm">Your cart is empty</p>
                      <Modal.Close class="bg-transparent border-none p-0 mt-4">
                        <Link href="/" class="inline-flex items-center justify-center py-2.5 px-6 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors">
                          Continue Shopping
                        </Link>
                      </Modal.Close>
                    </div>
                  ) : (
                    <div class="flex flex-col gap-4">
                      {cartData.value.lines.edges.map((edge) => {
                        const line = edge.node;
                        const product = line.merchandise.product;
                        return (
                          <div key={line.id} class="flex gap-3">
                            {product.featuredImage ? (
                              <Link href={`/product/${product.handle}/`} class="flex-shrink-0">
                                <img
                                  src={product.featuredImage.url}
                                  alt={product.featuredImage.altText || product.title}
                                  width={72}
                                  height={72}
                                  class="w-[72px] h-[72px] rounded-lg object-cover border border-warm"
                                />
                              </Link>
                            ) : (
                              <div class="w-[72px] h-[72px] rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                            )}
                            <div class="flex-1 min-w-0">
                              <Link href={`/product/${product.handle}/`} class="text-sm font-semibold leading-snug hover:text-primary transition-colors line-clamp-2">
                                {product.title}
                              </Link>
                              {line.merchandise.title !== "Default Title" && (
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{line.merchandise.title}</p>
                              )}
                              <div class="flex items-center justify-between mt-1.5">
                                <div class="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    class="w-7 h-7 flex items-center justify-center rounded-md border border-warm-strong bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                                    aria-label="Decrease quantity"
                                    onClick$={() => updateLineQuantity(line.id, line.quantity - 1)}
                                  >
                                    -
                                  </button>
                                  <span class="text-sm font-medium w-6 text-center">{line.quantity}</span>
                                  <button
                                    type="button"
                                    class="w-7 h-7 flex items-center justify-center rounded-md border border-warm-strong bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                                    aria-label="Increase quantity"
                                    onClick$={() => updateLineQuantity(line.id, line.quantity + 1)}
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    class="ml-1 text-gray-400 hover:text-red-500 transition-colors bg-transparent border-none p-0"
                                    aria-label="Remove item"
                                    onClick$={() => removeLineItem(line.id)}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                  </button>
                                </div>
                                <div class="text-right">
                                  <span class="text-sm font-bold text-primary">
                                    {formatPrice({
                                      amount: String(parseFloat(line.merchandise.price.amount) * line.quantity),
                                      currencyCode: line.merchandise.price.currencyCode,
                                    })}
                                  </span>
                                  {line.quantity > 1 && (
                                    <p class="text-[11px] text-gray-400">{line.quantity} x {formatPrice(line.merchandise.price)}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {cartData.value && cartData.value.lines.edges.length > 0 && (
                  <div class="border-t border-warm p-4">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span class="text-sm font-medium">
                        {formatPrice(cartData.value.cost.subtotalAmount)}
                      </span>
                    </div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-semibold">Estimated Total</span>
                      <span class="text-lg font-bold">
                        {formatPrice(cartData.value.cost.totalAmount)}
                      </span>
                    </div>
                    <p class="text-[11px] text-gray-400 dark:text-gray-500 mb-3">Taxes and shipping calculated at checkout</p>
                    <a
                      href={cartData.value.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block w-full text-center py-3 px-6 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                    >
                      Checkout
                    </a>
                  </div>
                )}
              </Modal.Panel>
            </Modal.Root>

            {/* Mobile hamburger menu */}
            <Modal.Root>
              <Modal.Trigger class="md:hidden relative flex flex-col justify-center items-center px-2.5 py-[0.45rem] gap-1.5 stitch-box-overlay-dark rounded-none bg-transparent">
                <span class="block w-5 h-0.5 bg-dark dark:bg-white rounded-full" />
                <span class="block w-5 h-0.5 bg-dark dark:bg-white rounded-full" />
                <span class="block w-5 h-0.5 bg-dark dark:bg-white rounded-full" />
              </Modal.Trigger>
            <Modal.Panel class="mobile-sheet stitch-border stitch-dark">
              {/* Light mode X-stitch texture */}
              <div class="absolute inset-0 pointer-events-none dark:hidden" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='7' viewBox='0 0 7 7'%3E%3Cline x1='0' y1='7' x2='7' y2='0' stroke='%23000000' stroke-opacity='0.03' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3Cline x1='0' y1='0' x2='7' y2='7' stroke='%23000000' stroke-opacity='0.03' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3C/svg%3E")` }} />
              {/* Dark mode X-stitch texture */}
              <div class="absolute inset-0 pointer-events-none hidden dark:block" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='7' viewBox='0 0 7 7'%3E%3Cline x1='0' y1='7' x2='7' y2='0' stroke='%23ffffff' stroke-opacity='0.04' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3Cline x1='0' y1='0' x2='7' y2='7' stroke='%23ffffff' stroke-opacity='0.04' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3C/svg%3E")` }} />
              <div class="stitch-v-seams stitch-dark" />
              <div class="flex items-center justify-between p-4 relative stitch-line-h-bottom stitch-dark">
                <div class="flex items-center gap-2">
                  <img src="/logo.png" alt="The Safety House" width="180" height="52" class="object-contain w-[180px] dark:invert" />
                  <img src="/flag.webp" alt="" width="32" height="32" class="w-8 h-8 object-contain" />
                </div>
                <Modal.Close class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-dark dark:hover:text-white bg-transparent border-none text-xl focus:outline-none">
                  &times;
                </Modal.Close>
              </div>
              <nav class="flex flex-col p-4 gap-1 overflow-y-auto">
                {[
                  { href: "/collections/work-wear/", handle: "work-wear", label: "Work Wear" },
                  { href: "/collections/safety-footwear/", handle: "safety-footwear", label: "Safety Footwear" },
                  { href: "/collections/flame-resistant/", handle: "flame-resistant", label: "Flame Resistant" },
                  { href: "/collections/safety-supplies/", handle: "safety-supplies", label: "Safety Supplies" },
                  { href: "/collections/casual-wear/", handle: "casual-wear", label: "Casual Wear" },
                ].map((item) => {
                  const isActive = loc.url.pathname === item.href
                    || loc.url.pathname.startsWith(`/collections/${item.handle}/`)
                    || loc.url.searchParams.get("collection") === item.handle;
                  return (
                    <Modal.Close key={item.handle} class="bg-transparent border-none text-left">
                      <Link href={item.href} class={`block py-3 px-3 text-sm font-medium rounded-lg transition-colors pattern-stripes ${isActive ? "nav-link-active" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                        {item.label}
                      </Link>
                    </Modal.Close>
                  );
                })}
                <div class="relative my-2 stitch-line-h stitch-dark" style={{ height: '1px' }} />
                <Modal.Close class="bg-transparent border-none text-left">
                  <Link href="/about/" class="block py-3 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                    About Us
                  </Link>
                </Modal.Close>
                <Modal.Close class="bg-transparent border-none text-left">
                  <Link href="/faq/" class="block py-3 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                    FAQ
                  </Link>
                </Modal.Close>
                <Modal.Close class="bg-transparent border-none text-left">
                  <Link href="/contact/" class="block py-3 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                    Contact
                  </Link>
                </Modal.Close>
              </nav>
              {/* Promotional Banner */}
              <div class="mt-auto p-4">
                <div class="relative rounded-xl overflow-hidden bg-[#1a1a1a] text-white p-5 text-center">
                  <div class="absolute inset-0 pointer-events-none opacity-80" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6a817' fill-opacity='0.15'%3E%3Cpath d='M9 0h3L0 12V9zM12 9v3H9z'/%3E%3C/g%3E%3C/svg%3E")` }} />
                  {/* Stitch corners — subtle */}
                  <svg class="absolute top-2.5 left-2.5 w-6 h-6 pointer-events-none overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <line x1="-6" y1="1" x2="40" y2="1" stroke="rgba(156,163,175,0.08)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                    <line x1="1" y1="-6" x2="1" y2="40" stroke="rgba(156,163,175,0.08)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                  </svg>
                  <svg class="absolute bottom-2.5 right-2.5 w-6 h-6 pointer-events-none overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <line x1="0" y1="39" x2="46" y2="39" stroke="rgba(156,163,175,0.08)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                    <line x1="39" y1="0" x2="39" y2="46" stroke="rgba(156,163,175,0.08)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                  </svg>
                  <p class="relative text-xs uppercase tracking-widest font-semibold text-primary mb-1">Limited Time</p>
                  <p class="relative text-lg font-bold leading-snug mb-2">Save 25% on all ______ products</p>
                  <p class="relative text-sm text-white/60">Use code <span class="font-bold text-primary">SALE25</span> at checkout</p>
                </div>
              </div>
              </Modal.Panel>
            </Modal.Root>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <Slot />

      {/* Footer */}
      <footer class="bg-dark text-white/80 relative stitch-line-h stitch-line-h-bottom stitch-light">
        <div class="stitch-v-seams stitch-light" />
        <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='7' viewBox='0 0 7 7'%3E%3Cline x1='0' y1='7' x2='7' y2='0' stroke='%23ffffff' stroke-opacity='0.06' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3Cline x1='0' y1='0' x2='7' y2='7' stroke='%23ffffff' stroke-opacity='0.06' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3C/svg%3E")` }} />
        <svg class="absolute top-2 right-2 md:top-3 md:right-3 pointer-events-none overflow-visible z-10" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <line x1="0" y1="1" x2="46" y2="1" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
          <line x1="39" y1="-6" x2="39" y2="40" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
        </svg>
        <svg class="absolute top-2 left-2 md:top-3 md:left-3 pointer-events-none overflow-visible z-10" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <line x1="-6" y1="1" x2="40" y2="1" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
          <line x1="1" y1="-6" x2="1" y2="40" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
        </svg>
        <div class="pt-9 px-4 pb-4 md:pt-11 md:px-6 md:pb-5">
          <div class="relative grid grid-cols-1 xs:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-8 md:gap-14 mb-6">
            <div class="relative">
              <img
                src="/logo.png"
                alt="The Safety House"
                width="160"
                height="46"
                class="object-contain w-[160px] invert mb-3"
              />
              <p class="text-xs leading-relaxed text-white/40 tracking-wide mb-4">
                Your one stop shop for quality specialized clothing, safety
                footwear, and in-house embroidery services.
              </p>
              <div class="flex items-center gap-2.5">
                <a href="https://www.instagram.com/thesafetyhouse/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-primary/20 hover:text-primary transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://www.facebook.com/thesafetyhouse/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-primary/20 hover:text-primary transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="mailto:info@safetyhouse.ca" aria-label="Email" class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-primary/20 hover:text-primary transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </a>
                <a href="tel:613-224-6804" aria-label="Phone" class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-primary/20 hover:text-primary transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </a>
              </div>
            </div>
            <div class="grid grid-cols-2 md:contents gap-8">
              <div class="relative">
                <h4 class="relative inline-block text-[0.7rem] uppercase tracking-[0.12em] text-white/40 font-semibold mb-3 py-0.5">
                  <svg class="absolute -top-0.5 -left-1.5 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true"><line x1="0" y1="0.5" x2="12" y2="0.5" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /><line x1="0.5" y1="0" x2="0.5" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /></svg>
                  Shop
                </h4>
                <Link href="/collections/work-wear/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">Work Wear</Link>
                <Link href="/collections/safety-footwear/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">Safety Footwear</Link>
                <Link href="/collections/safety-supplies/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">Safety Supplies</Link>
                <Link href="/collections/flame-resistant/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">Flame Resistant</Link>
                <Link href="/collections/casual-wear/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">Casual Wear</Link>
                <svg class="absolute bottom-0 right-0 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true"><line x1="0" y1="11.5" x2="12" y2="11.5" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /><line x1="11.5" y1="0" x2="11.5" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /></svg>
              </div>
              <div class="relative">
                <h4 class="relative inline-block text-[0.7rem] uppercase tracking-[0.12em] text-white/40 font-semibold mb-3 py-0.5">
                  <svg class="absolute -top-0.5 -left-1.5 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true"><line x1="0" y1="0.5" x2="12" y2="0.5" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /><line x1="0.5" y1="0" x2="0.5" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /></svg>
                  Info
                </h4>
                <Link href="/about/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">About Us</Link>
                <Link href="/embroidery/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">Embroidery</Link>
                <Link href="/store-hours/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">Store Hours</Link>
                <Link href="/faq/" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">FAQ</Link>
                <svg class="absolute bottom-0 right-0 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true"><line x1="0" y1="11.5" x2="12" y2="11.5" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /><line x1="11.5" y1="0" x2="11.5" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /></svg>
              </div>
            </div>
            <div class="grid grid-cols-2 md:contents gap-8">
              <div class="relative">
                <h4 class="relative inline-block text-[0.7rem] uppercase tracking-[0.12em] text-white/40 font-semibold mb-3 py-0.5">
                  <svg class="absolute -top-0.5 -left-1.5 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true"><line x1="0" y1="0.5" x2="12" y2="0.5" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /><line x1="0.5" y1="0" x2="0.5" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /></svg>
                  Visit Us
                </h4>
                <p class="text-xs text-white/50 tracking-wide leading-relaxed">
                  595 West Hunt Club Rd
                  <br />
                  Nepean, ON K2G 5X6
                </p>
                <a href="tel:613-224-6804" class="block text-xs text-white/50 tracking-wide py-0.5 mt-3 transition-colors hover:text-primary">613-224-6804</a>
                <a href="mailto:info@safetyhouse.ca" class="block text-xs text-white/50 tracking-wide py-0.5 transition-colors hover:text-primary">info@safetyhouse.ca</a>
                <svg class="absolute bottom-0 right-0 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true"><line x1="0" y1="11.5" x2="12" y2="11.5" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /><line x1="11.5" y1="0" x2="11.5" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /></svg>
              </div>
              <div class="relative">
                <h4 class="relative inline-block text-[0.7rem] uppercase tracking-[0.12em] text-white/40 font-semibold mb-3 py-0.5">
                  <svg class="absolute -top-0.5 -left-1.5 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true"><line x1="0" y1="0.5" x2="12" y2="0.5" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /><line x1="0.5" y1="0" x2="0.5" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /></svg>
                  Stay Updated
                </h4>
                <p class="text-xs text-white/50 tracking-wide leading-relaxed mb-3">Get updates on new arrivals and promotions.</p>
                <form preventdefault:submit onSubmit$={() => {}} class="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    required
                    class="flex-1 min-w-0 bg-white/10 border border-white/10 rounded-l-md px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button type="submit" class="rounded-r-md px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 border-l-0 transition-colors whitespace-nowrap">
                    Subscribe
                  </button>
                </form>
                <svg class="absolute bottom-0 right-0 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true"><line x1="0" y1="11.5" x2="12" y2="11.5" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /><line x1="11.5" y1="0" x2="11.5" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" /></svg>
              </div>
            </div>
            {/* Mailing list — mobile only, full width */}
            <div class="md:hidden col-span-full">
              <p class="text-[0.7rem] uppercase tracking-[0.12em] text-white/40 font-semibold mb-2">Stay Updated</p>
              <form preventdefault:submit onSubmit$={() => {}} class="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  required
                  class="flex-1 min-w-0 bg-white/10 border border-white/10 rounded-l-md px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button type="submit" class="relative overflow-hidden rounded-r-md px-3 py-1.5 text-xs font-semibold text-white bg-primary/15 hover:bg-primary/25 transition-colors whitespace-nowrap">
                  <span class="absolute inset-0 pointer-events-none opacity-80" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6a817' fill-opacity='0.8'%3E%3Cpath d='M6 0h2L0 8V6zM8 6v2H6z'/%3E%3C/g%3E%3C/svg%3E")` }} />
                  <span class="relative">Subscribe</span>
                </button>
              </form>
            </div>
          </div>
          <div class="relative pt-4 flex items-center text-xs text-white/35 stitch-line-h stitch-light">
            {/* Cross-ends on the stitch line — aligned with corner brackets above */}
            <svg class="absolute top-0 -left-3 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <line x1="6" y1="0" x2="6" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              <line x1="0" y1="6" x2="12" y2="6" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
            </svg>
            <svg class="absolute top-0 -right-3 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none overflow-visible" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <line x1="6" y1="0" x2="6" y2="12" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              <line x1="0" y1="6" x2="12" y2="6" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
            </svg>
            <span>&copy; {new Date().getFullYear()} The Safety House</span>
            <span class="ml-auto flex items-center gap-3 mr-3">
              <Link href="/privacy/" class="hover:text-primary transition-colors"><span class="md:hidden">Privacy</span><span class="hidden md:inline">Privacy Policy</span></Link>
              <Link href="/accessibility/" class="hover:text-primary transition-colors">Accessibility</Link>
            </span>
            <button
              onClick$={toggleDarkMode}
              class="text-white/50 hover:text-primary transition-colors bg-transparent border-none"
              aria-label="Toggle dark mode"
            >
              {darkMode.value ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
    {/* Cloudflare Web Analytics — free, privacy-friendly, no cookies */}
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${import.meta.env.VITE_CF_ANALYTICS_TOKEN || ""}"}`}
    />
    </div>
  );
});
