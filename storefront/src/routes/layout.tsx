import { component$, useContext } from "@builder.io/qwik";
import { Slot } from "@builder.io/qwik";
import { CartProvider, CartContext, CartActionsContext } from "~/context/cart";
import CartDrawer from "~/components/cart-drawer";

const Header = component$(() => {
  const cart = useContext(CartContext);
  const actions = useContext(CartActionsContext);

  return (
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="/" class="text-xl font-bold text-gray-900">
          Safety House
        </a>
        <nav class="flex items-center gap-6">
          <a href="/" class="text-gray-600 hover:text-gray-900">
            Products
          </a>
          <button
            class="relative text-gray-600 hover:text-gray-900"
            onClick$={() => actions.toggleCart()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cart.item_count > 0 && (
              <span class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.item_count}
              </span>
            )}
          </button>
          <a
            href="/pos"
            class="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700"
          >
            POS
          </a>
        </nav>
      </div>
    </header>
  );
});

export default component$(() => {
  return (
    <CartProvider>
      <div class="min-h-screen bg-gray-50">
        <Header />
        <main>
          <Slot />
        </main>
        <CartDrawer />
      </div>
    </CartProvider>
  );
});
