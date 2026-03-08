import { component$, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$, Link, useLocation } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { searchProducts, formatPrice } from "~/lib/medusa";
import type { ShopifyProduct, PageInfo } from "~/lib/medusa";

export const useSearchResults = routeLoader$(async (requestEvent) => {
  const query = requestEvent.query.get("q") || "";
  if (!query.trim()) {
    return { products: [] as ShopifyProduct[], pageInfo: { hasNextPage: false, endCursor: null } as PageInfo, totalCount: 0, query: "" };
  }
  const result = await searchProducts(query.trim(), 20);
  return { ...result, query: query.trim() };
});

export default component$(() => {
  const data = useSearchResults();
  const location = useLocation();
  const initialQuery = location.url.searchParams.get("q") || "";

  const loadedProducts = useSignal<ShopifyProduct[]>(data.value.products);
  const endCursor = useSignal<string | null>(data.value.pageInfo.endCursor);
  const hasNextPage = useSignal(data.value.pageInfo.hasNextPage);
  const loadingMore = useSignal(false);
  const searchInput = useSignal(initialQuery);

  const loadMore = $(async () => {
    if (!hasNextPage.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
      const result = await searchProducts(data.value.query, 20, endCursor.value || undefined);
      loadedProducts.value = [...loadedProducts.value, ...result.products];
      endCursor.value = result.pageInfo.endCursor;
      hasNextPage.value = result.pageInfo.hasNextPage;
    } catch (err) {
      console.error("Failed to load more results:", err);
    } finally {
      loadingMore.value = false;
    }
  });

  return (
    <div class="px-4 md:px-8 py-6 md:py-10 min-h-[500px]">
      {/* Search input for mobile / landing without query */}
      <div class="max-w-xl mx-auto mb-8">
        <form
          preventdefault:submit
          onSubmit$={() => {
            if (searchInput.value.trim()) {
              window.location.href = `/search/?q=${encodeURIComponent(searchInput.value.trim())}`;
            }
          }}
          class="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-[#1e1e1e]"
        >
          <svg class="w-5 h-5 ml-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            class="flex-1 px-3 py-3 text-base bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            value={searchInput.value}
            onInput$={(_, el) => { searchInput.value = el.value; }}
            autoFocus
          />
          <button type="submit" class="px-5 py-3 bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors">
            Search
          </button>
        </form>
      </div>

      {data.value.query ? (
        <>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {data.value.totalCount} result{data.value.totalCount !== 1 ? "s" : ""} for "{data.value.query}"
          </p>

          {loadedProducts.value.length === 0 ? (
            <div class="text-center py-16">
              <p class="text-gray-500 dark:text-gray-400 mb-4">No products found for "{data.value.query}"</p>
              <Link
                href="/"
                class="inline-flex items-center justify-center py-2.5 px-6 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                Browse Collections
              </Link>
            </div>
          ) : (
            <>
              <div class="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-1 md:gap-1.5">
                {loadedProducts.value.map((product: ShopifyProduct) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.handle}/`}
                    class="group bg-white dark:bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col"
                  >
                    {product.featuredImage ? (
                      <img
                        src={product.featuredImage.url}
                        alt={product.featuredImage.altText || product.title}
                        width={400}
                        height={400}
                        class="w-full aspect-square md:h-[280px] md:aspect-auto object-cover bg-gray-100 dark:bg-gray-800 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div class="w-full aspect-square md:h-[280px] md:aspect-auto bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                        No image
                      </div>
                    )}
                    <div class="p-4 px-5 flex-1 flex flex-col">
                      {product.vendor && (
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          {product.vendor}
                        </span>
                      )}
                      <h3 class="text-[0.95rem] font-semibold mb-1 leading-snug">
                        {product.title}
                      </h3>
                      <span class="text-base font-bold text-primary mt-auto pt-2">
                        {formatPrice(product.priceRange.minVariantPrice)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {hasNextPage.value && (
                <div class="text-center mt-8">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 py-3 px-8 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    disabled={loadingMore.value}
                    onClick$={loadMore}
                  >
                    {loadingMore.value ? (
                      <>
                        <div class="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More Results"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div class="text-center py-16">
          <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <p class="text-gray-500 dark:text-gray-400">Enter a search term to find products</p>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useSearchResults);
  return {
    title: data.query
      ? `Search: ${data.query} | The Safety House`
      : "Search | The Safety House",
  };
};
