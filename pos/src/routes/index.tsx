import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { type DocumentHead } from "@builder.io/qwik-city";
import ProductCard from "~/components/product-card";

export const useProducts = routeLoader$(async ({ env }) => {
  const backendUrl = env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000";
  const key = env.get("MEDUSA_PUBLISHABLE_KEY") || "";
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (key) headers["x-publishable-api-key"] = key;

    const res = await fetch(`${backendUrl}/store/products?limit=100&fields=%2Bvariants.calculated_price,%2Bvariants.inventory_quantity&region_id=reg_01KJV8N6A5Y58TTVRAP5R75SC7`, {
      headers,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products || [];
  } catch {
    return [];
  }
});

export default component$(() => {
  const products = useProducts();

  return (
    <div class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Our Products</h1>
      {products.value.length === 0 ? (
        <p class="text-gray-500">
          No products found. Make sure the Medusa backend is running and seeded.
        </p>
      ) : (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.value.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "M1 Store",
  meta: [
    {
      name: "description",
      content: "Retail store powered by MedusaJS and QwikJS",
    },
  ],
};
