import { component$, useContext } from "@builder.io/qwik";
import { CartContext, CartActionsContext } from "~/context/cart";

export default component$(() => {
  const cart = useContext(CartContext);
  const actions = useContext(CartActionsContext);

  if (!cart.open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 bg-black/50 z-40"
        onClick$={() => actions.toggleCart()}
      />

      {/* Drawer */}
      <div class="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b">
          <h2 class="text-lg font-bold text-gray-900">
            Cart ({cart.item_count})
          </h2>
          <button
            class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            onClick$={() => actions.toggleCart()}
          >
            &times;
          </button>
        </div>

        {/* Items */}
        <div class="flex-1 overflow-y-auto p-4">
          {cart.items.length === 0 ? (
            <p class="text-gray-500 text-center py-12">Your cart is empty</p>
          ) : (
            <div class="space-y-4">
              {cart.items.map((item) => (
                <div key={item.id} class="flex gap-3 border-b pb-4">
                  {/* Thumbnail */}
                  <div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        width={64}
                        height={64}
                        class="w-full h-full object-cover"
                      />
                    ) : (
                      <div class="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    {item.variant_title && item.variant_title !== "Default" && (
                      <p class="text-xs text-gray-500">{item.variant_title}</p>
                    )}
                    <p class="text-sm font-semibold text-gray-900 mt-1">
                      ${(item.unit_price / 100).toFixed(2)}
                    </p>

                    {/* Quantity controls */}
                    <div class="flex items-center gap-2 mt-2">
                      <button
                        class="w-7 h-7 rounded border text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold disabled:opacity-30"
                        disabled={cart.loading}
                        onClick$={() => {
                          if (item.quantity <= 1) {
                            actions.removeItem(item.id);
                          } else {
                            actions.updateQuantity(item.id, item.quantity - 1);
                          }
                        }}
                      >
                        &minus;
                      </button>
                      <span class="text-sm font-medium w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        class="w-7 h-7 rounded border text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm font-bold disabled:opacity-30"
                        disabled={cart.loading}
                        onClick$={() =>
                          actions.updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                      <button
                        class="ml-auto text-xs text-red-500 hover:text-red-700"
                        onClick$={() => actions.removeItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div class="border-t p-4 space-y-3">
            <div class="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span>${(cart.total / 100).toFixed(2)} CAD</span>
            </div>
            <a
              href="/cart"
              class="block w-full bg-gray-900 text-white text-center py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              onClick$={() => actions.toggleCart()}
            >
              View Cart &amp; Checkout
            </a>
          </div>
        )}
      </div>
    </>
  );
});
