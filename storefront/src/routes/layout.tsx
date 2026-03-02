import { component$, Slot, useContextProvider, useStore, createContextId } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export interface CartState {
  cartId: string;
  items: any[];
  total: number;
  count: number;
}

export const CartContext = createContextId<CartState>("cart-context");

export const useServerConfig = routeLoader$(async ({ env }) => {
  return {
    backendUrl: env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000",
    publishableKey: env.get("MEDUSA_PUBLISHABLE_KEY") || "",
  };
});

export default component$(() => {
  const cartState = useStore<CartState>({
    cartId: "",
    items: [],
    total: 0,
    count: 0,
  });

  useContextProvider(CartContext, cartState);

  return (
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" class="text-xl font-bold text-gray-900">
            M1 Store
          </a>
          <nav class="flex items-center gap-6">
            <a href="/" class="text-gray-600 hover:text-gray-900">
              Products
            </a>
            <a
              href="/cart"
              class="relative text-gray-600 hover:text-gray-900"
            >
              Cart
              {cartState.count > 0 && (
                <span class="absolute -top-2 -right-4 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartState.count}
                </span>
              )}
            </a>
            <a
              href="/pos"
              class="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700"
            >
              POS
            </a>
          </nav>
        </div>
      </header>
      <main>
        <Slot />
      </main>
    </div>
  );
});
