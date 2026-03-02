import { component$, useContext, useSignal } from "@builder.io/qwik";
import { CartContext } from "~/routes/layout";

export default component$(() => {
  const cart = useContext(CartContext);
  const step = useSignal<"shipping" | "payment" | "complete">("shipping");
  const email = useSignal("");
  const firstName = useSignal("");
  const lastName = useSignal("");
  const address = useSignal("");
  const city = useSignal("");
  const country = useSignal("us");
  const postalCode = useSignal("");
  const processing = useSignal(false);

  if (cart.items.length === 0 && step.value !== "complete") {
    return (
      <div class="max-w-2xl mx-auto px-4 py-8 text-center">
        <p class="text-gray-500 text-lg">Your cart is empty.</p>
        <a href="/" class="mt-4 inline-block text-blue-600 hover:underline">
          Continue shopping
        </a>
      </div>
    );
  }

  if (step.value === "complete") {
    return (
      <div class="max-w-2xl mx-auto px-4 py-16 text-center">
        <div class="text-green-600 text-5xl mb-4">&#10003;</div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
        <p class="text-gray-600">
          Thank you for your purchase. Your order has been received.
        </p>
        <a
          href="/"
          class="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div class="max-w-2xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>

      <div class="flex gap-4 mb-8">
        <div
          class={`flex-1 h-1 rounded ${step.value === "shipping" ? "bg-blue-600" : "bg-blue-600"}`}
        />
        <div
          class={`flex-1 h-1 rounded ${step.value === "payment" ? "bg-blue-600" : "bg-gray-200"}`}
        />
      </div>

      {step.value === "shipping" && (
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">Shipping Information</h2>
          <input
            type="email"
            placeholder="Email"
            class="w-full border rounded-md px-3 py-2"
            value={email.value}
            onInput$={(e) =>
              (email.value = (e.target as HTMLInputElement).value)
            }
          />
          <div class="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              class="border rounded-md px-3 py-2"
              value={firstName.value}
              onInput$={(e) =>
                (firstName.value = (e.target as HTMLInputElement).value)
              }
            />
            <input
              type="text"
              placeholder="Last Name"
              class="border rounded-md px-3 py-2"
              value={lastName.value}
              onInput$={(e) =>
                (lastName.value = (e.target as HTMLInputElement).value)
              }
            />
          </div>
          <input
            type="text"
            placeholder="Address"
            class="w-full border rounded-md px-3 py-2"
            value={address.value}
            onInput$={(e) =>
              (address.value = (e.target as HTMLInputElement).value)
            }
          />
          <div class="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="City"
              class="border rounded-md px-3 py-2"
              value={city.value}
              onInput$={(e) =>
                (city.value = (e.target as HTMLInputElement).value)
              }
            />
            <input
              type="text"
              placeholder="Postal Code"
              class="border rounded-md px-3 py-2"
              value={postalCode.value}
              onInput$={(e) =>
                (postalCode.value = (e.target as HTMLInputElement).value)
              }
            />
          </div>
          <button
            class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            onClick$={() => (step.value = "payment")}
          >
            Continue to Payment
          </button>
        </div>
      )}

      {step.value === "payment" && (
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">Payment</h2>
          <div class="bg-gray-50 p-4 rounded-lg border">
            <p class="text-sm text-gray-600">
              This is a demo checkout. No real payment is processed.
            </p>
          </div>
          <div class="bg-white p-4 rounded-lg border">
            <h3 class="font-medium mb-2">Order Summary</h3>
            {cart.items.map((item: any) => (
              <div key={item.id} class="flex justify-between text-sm py-1">
                <span>
                  {item.title} x {item.quantity}
                </span>
                <span>
                  {((item.unit_price * item.quantity) / 100).toFixed(2)}
                </span>
              </div>
            ))}
            <div class="border-t mt-2 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{(cart.total / 100).toFixed(2)}</span>
            </div>
          </div>
          <button
            class="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
            disabled={processing.value}
            onClick$={() => {
              processing.value = true;
              cart.items = [];
              cart.count = 0;
              cart.total = 0;
              cart.cartId = "";
              step.value = "complete";
              processing.value = false;
            }}
          >
            {processing.value ? "Processing..." : "Place Order"}
          </button>
        </div>
      )}
    </div>
  );
});
