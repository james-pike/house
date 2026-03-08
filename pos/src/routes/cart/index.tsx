import { component$, useContext } from "@builder.io/qwik";
import { CartContext, CartActionsContext } from "~/context/cart";

export default component$(() => {
  const cart = useContext(CartContext);
  const actions = useContext(CartActionsContext);

  return (
    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {cart.items.length === 0 ? (
        <div class="text-center py-16">
          <p class="text-gray-500 text-lg mb-4">Your cart is empty</p>
          <a
            href="/"
            class="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800"
          >
            Continue Shopping
          </a>
        </div>
      ) : (
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div class="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                class="flex gap-4 bg-white rounded-lg border p-4"
              >
                <div class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      width={96}
                      height={96}
                      class="w-full h-full object-cover"
                    />
                  ) : (
                    <div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                </div>

                <div class="flex-1">
                  <a
                    href={`/products/${item.product_handle || ""}`}
                    class="text-base font-medium text-gray-900 hover:text-blue-600"
                  >
                    {item.title}
                  </a>
                  {item.variant_title && item.variant_title !== "Default" && (
                    <p class="text-sm text-gray-500 mt-0.5">
                      {item.variant_title}
                    </p>
                  )}
                  <p class="text-base font-semibold text-gray-900 mt-1">
                    ${(item.unit_price / 100).toFixed(2)}
                  </p>

                  <div class="flex items-center gap-3 mt-3">
                    <button
                      class="w-8 h-8 rounded border text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold disabled:opacity-30"
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
                    <span class="text-base font-medium w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      class="w-8 h-8 rounded border text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold disabled:opacity-30"
                      disabled={cart.loading}
                      onClick$={() =>
                        actions.updateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                    <button
                      class="ml-4 text-sm text-red-500 hover:text-red-700"
                      onClick$={() => actions.removeItem(item.id)}
                    >
                      Remove
                    </button>

                    <span class="ml-auto font-semibold text-gray-900">
                      ${((item.unit_price * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div class="lg:col-span-1">
            <div class="bg-white rounded-lg border p-6 sticky top-8">
              <h2 class="text-lg font-bold text-gray-900 mb-4">
                Order Summary
              </h2>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.item_count} items)</span>
                  <span>${(cart.total / 100).toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span class="text-green-600">Calculated at checkout</span>
                </div>
              </div>
              <div class="border-t mt-4 pt-4 flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>${(cart.total / 100).toFixed(2)} CAD</span>
              </div>
              <button
                class="mt-6 w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                disabled={cart.loading || cart.items.length === 0}
              >
                Proceed to Checkout
              </button>
              <a
                href="/"
                class="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3"
              >
                Continue Shopping
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
