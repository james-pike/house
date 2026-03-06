import { component$, useSignal } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useProduct = routeLoader$(async ({ params, env }) => {
  const backendUrl = env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000";
  const key = env.get("MEDUSA_PUBLISHABLE_KEY") || "";
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (key) headers["x-publishable-api-key"] = key;

    const res = await fetch(
      `${backendUrl}/store/products?handle=${params.handle}&fields=%2Bvariants.calculated_price,%2Bvariants.inventory_quantity&region_id=reg_01KJV8N6A5Y58TTVRAP5R75SC7`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.products?.[0] || null;
  } catch {
    return null;
  }
});

export default component$(() => {
  const product = useProduct();
  const selectedVariant = useSignal(0);

  if (!product.value) {
    return (
      <div class="max-w-4xl mx-auto px-4 py-8">
        <p class="text-gray-500">Product not found.</p>
      </div>
    );
  }

  const p = product.value;
  const variant = p.variants?.[selectedVariant.value];
  const calcPrice = variant?.calculated_price;
  const price = variant?.prices?.[0];
  const thumbnail = p.thumbnail || p.images?.[0]?.url;

  let formattedPrice = "";
  if (calcPrice?.calculated_amount != null) {
    formattedPrice = `$${(calcPrice.calculated_amount / 100).toFixed(2)} ${calcPrice.currency_code?.toUpperCase() || ""}`;
  } else if (price) {
    formattedPrice = `$${(price.amount / 100).toFixed(2)} ${price.currency_code?.toUpperCase() || ""}`;
  }

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <a href="/" class="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to products
      </a>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={p.title}
              width={600}
              height={600}
              class="w-full h-full object-cover"
            />
          ) : (
            <div class="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{p.title}</h1>
          {formattedPrice && (
            <p class="mt-2 text-2xl font-semibold text-gray-900">
              {formattedPrice}
            </p>
          )}
          <p class="mt-4 text-gray-600">{p.description}</p>

          {p.variants?.length > 1 && (
            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Variant
              </label>
              <select
                class="border rounded-md px-3 py-2 w-full max-w-xs"
                value={selectedVariant.value}
                onChange$={(e) => {
                  selectedVariant.value = Number(
                    (e.target as HTMLSelectElement).value
                  );
                }}
              >
                {p.variants.map((v: any, i: number) => (
                  <option key={v.id} value={i}>
                    {v.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Product details */}
          <div class="mt-6 border-t pt-4">
            <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Details</h2>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {variant?.sku && (
                <>
                  <dt class="text-gray-500">SKU</dt>
                  <dd class="text-gray-900 font-mono">{variant.sku}</dd>
                </>
              )}
              {variant?.barcode && (
                <>
                  <dt class="text-gray-500">Barcode</dt>
                  <dd class="text-gray-900 font-mono">{variant.barcode}</dd>
                </>
              )}
              <dt class="text-gray-500">Stock</dt>
              <dd class={variant?.inventory_quantity > 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {variant?.inventory_quantity != null
                  ? `${variant.inventory_quantity.toLocaleString()} units`
                  : "—"}
              </dd>
              {p.weight && (
                <>
                  <dt class="text-gray-500">Weight</dt>
                  <dd class="text-gray-900">{p.weight}g</dd>
                </>
              )}
              {variant?.material && (
                <>
                  <dt class="text-gray-500">Material</dt>
                  <dd class="text-gray-900">{variant.material}</dd>
                </>
              )}
              {variant?.origin_country && (
                <>
                  <dt class="text-gray-500">Origin</dt>
                  <dd class="text-gray-900">{variant.origin_country}</dd>
                </>
              )}
              {variant?.hs_code && (
                <>
                  <dt class="text-gray-500">HS Code</dt>
                  <dd class="text-gray-900 font-mono">{variant.hs_code}</dd>
                </>
              )}
            </dl>
          </div>

          {/* All variants table */}
          {p.variants?.length > 1 && (
            <div class="mt-6 border-t pt-4">
              <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">All Variants</h2>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-gray-500 border-b">
                      <th class="pb-2 pr-4">Variant</th>
                      <th class="pb-2 pr-4">SKU</th>
                      <th class="pb-2 pr-4">Price</th>
                      <th class="pb-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.variants.map((v: any) => {
                      const vPrice = v.calculated_price?.calculated_amount;
                      const vCurrency = v.calculated_price?.currency_code?.toUpperCase() || "";
                      return (
                        <tr key={v.id} class="border-b last:border-0">
                          <td class="py-2 pr-4 text-gray-900">{v.title}</td>
                          <td class="py-2 pr-4 text-gray-600 font-mono text-xs">{v.sku || "—"}</td>
                          <td class="py-2 pr-4 text-gray-900">
                            {vPrice != null ? `$${(vPrice / 100).toFixed(2)} ${vCurrency}` : "—"}
                          </td>
                          <td class={`py-2 ${(v.inventory_quantity ?? 0) > 0 ? "text-green-600" : "text-red-500"}`}>
                            {v.inventory_quantity?.toLocaleString() ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
