import {
  component$,
  useContext,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { CartContext } from "~/routes/layout";

export const useProduct = routeLoader$(async ({ params, env }) => {
  const backendUrl = env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000";
  const key = env.get("MEDUSA_PUBLISHABLE_KEY") || "";
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (key) headers["x-publishable-api-key"] = key;

    const res = await fetch(
      `${backendUrl}/store/products?handle=${params.handle}`,
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
  const cart = useContext(CartContext);
  const selectedVariant = useSignal(0);
  const adding = useSignal(false);
  const message = useSignal("");

  if (!product.value) {
    return (
      <div class="max-w-4xl mx-auto px-4 py-8">
        <p class="text-gray-500">Product not found.</p>
      </div>
    );
  }

  const p = product.value;
  const variant = p.variants?.[selectedVariant.value];
  const price = variant?.prices?.[0];
  const thumbnail = p.thumbnail || p.images?.[0]?.url;

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => message.value);
    if (message.value) {
      const timer = setTimeout(() => (message.value = ""), 3000);
      return () => clearTimeout(timer);
    }
  });

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
          {price && (
            <p class="mt-2 text-2xl font-semibold text-gray-900">
              {(price.amount / 100).toFixed(2)}{" "}
              {price.currency_code?.toUpperCase()}
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

          <button
            class="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            disabled={adding.value}
            onClick$={async () => {
              if (!variant) return;
              adding.value = true;
              try {
                const backendUrl = "http://localhost:9000";
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                };

                if (!cart.cartId) {
                  const res = await fetch(`${backendUrl}/store/carts`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  cart.cartId = data.cart.id;
                }

                const res = await fetch(
                  `${backendUrl}/store/carts/${cart.cartId}/line-items`,
                  {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                      variant_id: variant.id,
                      quantity: 1,
                    }),
                  }
                );
                const data = await res.json();
                cart.items = data.cart.items || [];
                cart.count = cart.items.reduce(
                  (s: number, i: any) => s + i.quantity,
                  0
                );
                cart.total = data.cart.total || 0;
                message.value = "Added to cart!";
              } catch (err) {
                message.value = "Failed to add to cart";
              }
              adding.value = false;
            }}
          >
            {adding.value ? "Adding..." : "Add to Cart"}
          </button>

          {message.value && (
            <p class="mt-3 text-green-600 font-medium">{message.value}</p>
          )}
        </div>
      </div>
    </div>
  );
});
