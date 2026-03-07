import { component$, useSignal, useVisibleTask$, $, useContext } from "@builder.io/qwik";
import { PosConfigContext } from "../layout";

interface StockProduct {
  id: string;
  title: string;
  category?: string;
  variants: {
    id: string;
    title: string;
    sku: string;
    barcode: string;
    stock: number;
    price: number;
  }[];
}

export default component$(() => {
  const posConfig = useContext(PosConfigContext);
  const token = useSignal("");
  const search = useSignal("");
  const products = useSignal<StockProduct[]>([]);
  const loading = useSignal(false);
  const error = useSignal("");
  const expanded = useSignal<string | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const savedToken = localStorage.getItem("pos_token");
    if (savedToken) token.value = savedToken;
  });

  const searchProducts = $(async () => {
    if (!token.value) {
      error.value = "Not logged in";
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      const q = search.value.trim();
      const url = q
        ? `${posConfig.backendUrl}/admin/products?q=${encodeURIComponent(q)}&limit=50&fields=id,title,categories.name,variants.id,variants.title,variants.sku,variants.barcode,variants.inventory_items.inventory.location_levels.stocked_quantity,variants.prices.amount,variants.prices.currency_code`
        : `${posConfig.backendUrl}/admin/products?limit=50&fields=id,title,categories.name,variants.id,variants.title,variants.sku,variants.barcode,variants.inventory_items.inventory.location_levels.stocked_quantity,variants.prices.amount,variants.prices.currency_code`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token.value}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();

      products.value = (data.products || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        category: p.categories?.[0]?.name || "",
        variants: (p.variants || []).map((v: any) => {
          const cadPrice = v.prices?.find((pr: any) => pr.currency_code === "cad");
          const price = cadPrice?.amount || v.prices?.[0]?.amount || 0;
          const stock = v.inventory_items?.[0]?.inventory?.location_levels?.[0]?.stocked_quantity ?? 0;
          return {
            id: v.id,
            title: v.title || "Default",
            sku: v.sku || "",
            barcode: v.barcode || "",
            stock,
            price,
          };
        }),
      }));
    } catch (err: any) {
      error.value = err.message;
    }
    loading.value = false;
  });

  // Load all products on mount
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const savedToken = localStorage.getItem("pos_token");
    if (savedToken) {
      token.value = savedToken;
      await searchProducts();
    }
  });

  return (
    <div class="flex h-full relative overflow-hidden max-w-[100vw]">
      <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto overflow-x-hidden p-3">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <img src="/logo.png" alt="Safety House" class="h-7 invert" />
              <span class="text-sm font-bold text-emerald-400 uppercase tracking-wider">Stock</span>
            </div>
          </div>

          {!token.value && (
            <div class="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-2 rounded-lg mb-3">
              Not logged in — <a href="/pos/session" class="underline font-medium">login</a>
            </div>
          )}

          {error.value && (
            <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg mb-3">
              {error.value}
            </div>
          )}

          {/* Search */}
          <div class="mb-3">
            <input
              type="text"
              class="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:border-emerald-500 focus:outline-none"
              placeholder="Search products..."
              value={search.value}
              onInput$={(e) => (search.value = (e.target as HTMLInputElement).value)}
              onKeyDown$={(e) => { if (e.key === "Enter") searchProducts(); }}
            />
          </div>

          {loading.value && (
            <p class="text-gray-500 text-xs text-center py-4">Loading...</p>
          )}

          {/* Product list */}
          {!loading.value && products.value.length === 0 && (
            <p class="text-gray-600 text-xs text-center py-8">No products found</p>
          )}

          <div class="space-y-1.5">
            {products.value.map((product) => {
              const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
              const isExpanded = expanded.value === product.id;
              return (
                <div key={product.id} class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <button
                    class="w-full text-left p-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                    onClick$={() => (expanded.value = isExpanded ? null : product.id)}
                  >
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium truncate">{product.title}</p>
                      {product.category && (
                        <p class="text-[10px] text-gray-500 mt-0.5">{product.category}</p>
                      )}
                    </div>
                    <div class="flex items-center gap-2 ml-2">
                      <span class={`text-xs font-bold ${totalStock > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {totalStock}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        class={`text-gray-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div class="border-t border-gray-800 px-3 pb-3">
                      {product.variants.map((v) => (
                        <div key={v.id} class="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                          <div class="min-w-0 flex-1">
                            <p class="text-xs font-medium">{v.title}</p>
                            <p class="text-[10px] text-gray-500">
                              {v.sku && <span>SKU: {v.sku}</span>}
                              {v.barcode && <span class="ml-2">UPC: {v.barcode}</span>}
                            </p>
                          </div>
                          <div class="text-right ml-2">
                            <p class="text-xs font-bold">${(v.price / 100).toFixed(2)}</p>
                            <p class={`text-[10px] font-medium ${v.stock > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {v.stock} in stock
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
