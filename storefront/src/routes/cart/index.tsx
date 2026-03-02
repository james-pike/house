import { $, component$, useContext, useSignal } from "@builder.io/qwik";
import { CartContext } from "~/routes/layout";

export default component$(() => {
  const cart = useContext(CartContext);
  const updating = useSignal(false);

  const refreshCart = $(async () => {
    if (!cart.cartId) return;
    try {
      const res = await fetch(
        `http://localhost:9000/store/carts/${cart.cartId}`,
        { headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      cart.items = data.cart.items || [];
      cart.count = cart.items.reduce(
        (s: number, i: any) => s + i.quantity,
        0
      );
      cart.total = data.cart.total || 0;
    } catch {}
  });

  return (
    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

      {cart.items.length === 0 ? (
        <div class="text-center py-12">
          <p class="text-gray-500 text-lg">Your cart is empty.</p>
          <a
            href="/"
            class="mt-4 inline-block text-blue-600 hover:underline"
          >
            Continue shopping
          </a>
        </div>
      ) : (
        <div>
          <div class="space-y-4">
            {cart.items.map((item: any) => (
              <div
                key={item.id}
                class="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border"
              >
                <div class="flex-1">
                  <h3 class="font-medium text-gray-900">{item.title}</h3>
                  <p class="text-sm text-gray-500">{item.variant?.title}</p>
                </div>
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <button
                      class="w-8 h-8 rounded border flex items-center justify-center hover:bg-gray-100"
                      disabled={updating.value}
                      onClick$={async () => {
                        if (item.quantity <= 1) return;
                        updating.value = true;
                        try {
                          await fetch(
                            `http://localhost:9000/store/carts/${cart.cartId}/line-items/${item.id}`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                quantity: item.quantity - 1,
                              }),
                            }
                          );
                          await refreshCart();
                        } catch {}
                        updating.value = false;
                      }}
                    >
                      -
                    </button>
                    <span class="w-8 text-center">{item.quantity}</span>
                    <button
                      class="w-8 h-8 rounded border flex items-center justify-center hover:bg-gray-100"
                      disabled={updating.value}
                      onClick$={async () => {
                        updating.value = true;
                        try {
                          await fetch(
                            `http://localhost:9000/store/carts/${cart.cartId}/line-items/${item.id}`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                quantity: item.quantity + 1,
                              }),
                            }
                          );
                          await refreshCart();
                        } catch {}
                        updating.value = false;
                      }}
                    >
                      +
                    </button>
                  </div>
                  <p class="w-24 text-right font-semibold">
                    {((item.unit_price * item.quantity) / 100).toFixed(2)}
                  </p>
                  <button
                    class="text-red-500 hover:text-red-700 text-sm"
                    disabled={updating.value}
                    onClick$={async () => {
                      updating.value = true;
                      try {
                        await fetch(
                          `http://localhost:9000/store/carts/${cart.cartId}/line-items/${item.id}`,
                          { method: "DELETE" }
                        );
                        await refreshCart();
                      } catch {}
                      updating.value = false;
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div class="mt-8 bg-white p-6 rounded-lg shadow-sm border">
            <div class="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{(cart.total / 100).toFixed(2)}</span>
            </div>
            <a
              href="/checkout"
              class="mt-4 block text-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Proceed to Checkout
            </a>
          </div>
        </div>
      )}
    </div>
  );
});
