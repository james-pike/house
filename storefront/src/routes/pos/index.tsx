import { component$, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import BarcodeInput from "~/components/pos/barcode-input";
import PosCart from "~/components/pos/pos-cart";
import ProductLookup from "~/components/pos/product-lookup";
import Receipt from "~/components/pos/receipt";
import CashDrawer from "~/components/pos/cash-drawer";

interface PosItem {
  variant_id: string;
  title: string;
  sku: string;
  unit_price: number;
  quantity: number;
}

export default component$(() => {
  const items = useStore<PosItem[]>([]);
  const sessionId = useSignal("");
  const paymentMethod = useSignal<"cash" | "card">("cash");
  const amountTendered = useSignal(0);
  const lastSale = useSignal<any>(null);
  const showReceipt = useSignal(false);
  const processing = useSignal(false);
  const error = useSignal("");
  const token = useSignal("");

  // Auto-load auth token and session from localStorage
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const savedToken = localStorage.getItem("pos_token");
    const savedSession = localStorage.getItem("pos_session_id");
    if (savedToken) token.value = savedToken;
    if (savedSession) sessionId.value = savedSession;
  });

  const total = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const change =
    paymentMethod.value === "cash" ? amountTendered.value - total : 0;

  const addItem = $((variant: any) => {
    const price = variant.prices?.[0]?.amount || 0;
    const existing = items.find((i) => i.variant_id === variant.id);
    if (existing) {
      existing.quantity++;
    } else {
      items.push({
        variant_id: variant.id,
        title: `${variant.product?.title || ""} - ${variant.title}`,
        sku: variant.sku || "",
        unit_price: price,
        quantity: 1,
      });
    }
    error.value = "";
  });

  const removeItem = $((index: number) => {
    items.splice(index, 1);
  });

  const updateQuantity = $((index: number, qty: number) => {
    if (qty <= 0) {
      items.splice(index, 1);
    } else {
      items[index].quantity = qty;
    }
  });

  const processSale = $(async () => {
    if (!sessionId.value) {
      error.value = "No active session. Open a register session first.";
      return;
    }
    if (items.length === 0) {
      error.value = "Cart is empty.";
      return;
    }
    if (
      paymentMethod.value === "cash" &&
      amountTendered.value < total
    ) {
      error.value = "Insufficient amount tendered.";
      return;
    }

    processing.value = true;
    error.value = "";
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token.value) {
        headers["Authorization"] = `Bearer ${token.value}`;
      }

      const res = await fetch("http://localhost:9000/admin/pos/sale", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          session_id: sessionId.value,
          items: items.map((i) => ({
            variant_id: i.variant_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            title: i.title,
          })),
          payment_method: paymentMethod.value,
          amount_tendered:
            paymentMethod.value === "cash" ? amountTendered.value : undefined,
          currency_code: "cad",
          region_id: "",
          sales_channel_id: "",
          location_id: "",
        }),
      });

      if (!res.ok) {
        const data = await res.text();
        throw new Error(data);
      }

      const data = await res.json();
      lastSale.value = {
        ...data.sale,
        items: [...items],
        payment_method: paymentMethod.value,
        amount_tendered: amountTendered.value,
        change: change > 0 ? change : 0,
        total,
        date: new Date().toISOString(),
      };
      showReceipt.value = true;
      items.splice(0, items.length);
      amountTendered.value = 0;
    } catch (err: any) {
      error.value = `Sale failed: ${err.message}`;
    }
    processing.value = false;
  });

  const showCart = useSignal(false);

  return (
    <div class="flex h-full relative overflow-hidden">
      {/* Left: Product search / scanner */}
      <div class="flex-1 min-w-0 flex flex-col p-4 overflow-auto">
        <div class="flex items-center justify-between mb-4">
          <BarcodeInput
            token={token.value}
            onScan$={(variant: any) => addItem(variant)}
            onError$={(msg: string) => (error.value = msg)}
          />
          <button
            class="lg:hidden bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm ml-3 shrink-0"
            onClick$={() => (showCart.value = !showCart.value)}
          >
            Cart ({items.length})
          </button>
        </div>
        <ProductLookup
          token={token.value}
          onSelect$={(variant: any) => addItem(variant)}
        />
      </div>

      {/* Right: Cart + Payment */}
      <div class={`${showCart.value ? "fixed inset-0 z-40" : "hidden"} lg:relative lg:block lg:z-auto w-full lg:w-[420px] bg-gray-800 flex flex-col border-l border-gray-700`}>
        <div class="flex-1 overflow-auto p-4">
          <div class="flex items-center justify-between mb-3 lg:hidden">
            <h2 class="font-bold text-sm uppercase tracking-wide text-gray-400">Cart</h2>
            <button
              class="text-gray-400 hover:text-white text-sm"
              onClick$={() => (showCart.value = false)}
            >
              Close
            </button>
          </div>
          {!token.value && (
            <p class="text-yellow-400 text-xs mb-3">
              Not logged in — <a href="/pos/session" class="underline">open a session</a> first
            </p>
          )}

          <PosCart
            items={items}
            onRemove$={(i: number) => removeItem(i)}
            onUpdateQty$={(i: number, q: number) => updateQuantity(i, q)}
          />
        </div>

        {/* Payment section */}
        <div class="border-t border-gray-700 p-4">
          <div class="flex justify-between text-lg font-bold mb-3">
            <span>Total</span>
            <span>{(total / 100).toFixed(2)} CAD</span>
          </div>

          <div class="flex gap-2 mb-3">
            <button
              class={`flex-1 py-2 rounded text-sm font-medium ${paymentMethod.value === "cash" ? "bg-green-600" : "bg-gray-700"}`}
              onClick$={() => (paymentMethod.value = "cash")}
            >
              Cash
            </button>
            <button
              class={`flex-1 py-2 rounded text-sm font-medium ${paymentMethod.value === "card" ? "bg-blue-600" : "bg-gray-700"}`}
              onClick$={() => (paymentMethod.value = "card")}
            >
              Card
            </button>
          </div>

          {paymentMethod.value === "cash" && (
            <div class="mb-3">
              <CashDrawer
                total={total}
                amountTendered={amountTendered.value}
                onChange$={(val: number) => (amountTendered.value = val)}
              />
              {change > 0 && (
                <p class="text-green-400 text-sm mt-1">
                  Change: {(change / 100).toFixed(2)} CAD
                </p>
              )}
            </div>
          )}

          {error.value && (
            <p class="text-red-400 text-sm mb-2">{error.value}</p>
          )}

          <button
            class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg disabled:opacity-50"
            disabled={processing.value || items.length === 0}
            onClick$={processSale}
          >
            {processing.value ? "Processing..." : "Complete Sale"}
          </button>
        </div>
      </div>

      {/* Receipt overlay */}
      {showReceipt.value && lastSale.value && (
        <Receipt sale={lastSale.value} onClose$={() => (showReceipt.value = false)} />
      )}
    </div>
  );
});
