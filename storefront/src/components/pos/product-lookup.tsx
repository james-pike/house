import { component$, useSignal, type QRL } from "@builder.io/qwik";

interface Props {
  token: string;
  onSelect$: QRL<(variant: any) => void>;
}

export default component$<Props>(({ token, onSelect$ }) => {
  const query = useSignal("");
  const results = useSignal<any[]>([]);
  const loading = useSignal(false);

  return (
    <div>
      <label class="block text-sm text-gray-400 mb-1">Product Search</label>
      <input
        type="text"
        class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search products by name..."
        value={query.value}
        onInput$={(e) =>
          (query.value = (e.target as HTMLInputElement).value)
        }
        onKeyDown$={async (e) => {
          if (e.key !== "Enter" || !query.value.trim()) return;
          loading.value = true;
          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(
              `http://localhost:9000/admin/products?q=${encodeURIComponent(query.value)}&limit=10`,
              { headers, credentials: "include" }
            );
            if (res.ok) {
              const data = await res.json();
              results.value = data.products || [];
            }
          } catch {}
          loading.value = false;
        }}
      />

      {loading.value && (
        <p class="text-xs text-gray-400 mt-2">Searching...</p>
      )}

      {results.value.length > 0 && (
        <div class="mt-2 space-y-1 max-h-[400px] overflow-auto">
          {results.value.map((product: any) => (
            <div key={product.id} class="bg-gray-800 rounded-lg p-2">
              <p class="text-sm font-medium">{product.title}</p>
              <div class="mt-1 space-y-1">
                {product.variants?.map((variant: any) => (
                  <button
                    key={variant.id}
                    class="w-full text-left bg-gray-700 hover:bg-gray-600 rounded px-2 py-1.5 text-xs flex justify-between"
                    onClick$={() => {
                      onSelect$({
                        ...variant,
                        product: { title: product.title },
                      });
                    }}
                  >
                    <span>
                      {variant.title} ({variant.sku || "no sku"})
                    </span>
                    <span class="font-medium">
                      {variant.prices?.[0]
                        ? (variant.prices[0].amount / 100).toFixed(2)
                        : "N/A"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
