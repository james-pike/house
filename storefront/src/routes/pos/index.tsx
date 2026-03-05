// POS Terminal
import { component$, useSignal, useStore, useVisibleTask$, $, useContext } from "@builder.io/qwik";
import { PosConfigContext } from "./layout";
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
  const posConfig = useContext(PosConfigContext);
  const items = useStore<PosItem[]>([]);
  const sessionId = useSignal("");
  const paymentMethod = useSignal<"cash" | "card">("cash");
  const amountTendered = useSignal(0);
  const lastSale = useSignal<any>(null);
  const showReceipt = useSignal(false);
  const processing = useSignal(false);
  const error = useSignal("");
  const token = useSignal("");

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
    // Extract price — handle multiple Medusa response formats
    let price = 0;
    if (variant.price != null && variant.price > 0) {
      price = variant.price;
    } else if (variant.calculated_price?.calculated_amount != null) {
      price = variant.calculated_price.calculated_amount;
    } else if (variant.prices?.length > 0) {
      const cadPrice = variant.prices.find((p: any) => p.currency_code === "cad");
      price = (cadPrice || variant.prices[0])?.amount || 0;
    } else if (variant.original_price != null) {
      price = variant.original_price;
    }
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

      const res = await fetch(`${posConfig.backendUrl}/admin/pos/sale`, {
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
        currency_code: "cad",
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
    <div class="flex h-full relative overflow-hidden max-w-[100vw]">
      {/* Left: Product search / scanner */}
      <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Scrollable content area */}
        <div class="flex-1 overflow-y-auto overflow-x-hidden p-3">
          {/* Header */}
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <img src="/logo.png" alt="Safety House" class="h-7" />
              <span class="text-sm font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">POS</span>
            </div>
            <button
              class="lg:hidden bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
              onClick$={() => (showCart.value = !showCart.value)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {items.length}
            </button>
          </div>

          {/* Error display */}
          {error.value && (
            <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg mb-3">
              {error.value}
            </div>
          )}

          {/* Product search */}
          <ProductLookup
            token={token.value}
            backendUrl={posConfig.backendUrl}
            onSelect$={(variant: any) => addItem(variant)}
          />
        </div>

        {/* Bottom: Scanner input pinned above tabs */}
        <div class="shrink-0 border-t border-gray-800 bg-gray-900 p-2">
          <BarcodeInput
            token={token.value}
            backendUrl={posConfig.backendUrl}
            onScan$={(variant: any) => addItem(variant)}
            onError$={(msg: string) => (error.value = msg)}
          />
        </div>
      </div>

      {/* Right: Cart + Payment */}
      <div class={`${showCart.value ? "fixed inset-0 z-40" : "hidden"} lg:relative lg:block lg:z-auto w-full lg:w-[380px] lg:shrink-0 bg-gray-900 flex flex-col border-l border-gray-800 overflow-hidden`}>
        <div class="flex-1 overflow-auto p-3">
          <div class="flex items-center justify-between mb-2 lg:hidden">
            <h2 class="font-bold text-xs uppercase tracking-wide text-gray-500">Cart</h2>
            <button
              class="text-gray-500 hover:text-white text-xs"
              onClick$={() => (showCart.value = false)}
            >
              Close
            </button>
          </div>
          {!token.value && (
            <div class="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-2 rounded-lg mb-3">
              Not logged in — <a href="/pos/session" class="underline font-medium">open session</a>
            </div>
          )}

          <PosCart
            items={items}
            onRemove$={(i: number) => removeItem(i)}
            onUpdateQty$={(i: number, q: number) => updateQuantity(i, q)}
          />
        </div>

        {/* Payment section */}
        <div class="border-t border-gray-800 p-3">
          <div class="flex justify-between text-lg font-bold mb-2">
            <span class="text-gray-400">Total</span>
            <span>${(total / 100).toFixed(2)}</span>
          </div>

          <div class="flex gap-1.5 mb-2">
            <button
              class={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${paymentMethod.value === "cash" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"}`}
              onClick$={() => (paymentMethod.value = "cash")}
            >
              Cash
            </button>
            <button
              class={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${paymentMethod.value === "card" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}
              onClick$={() => (paymentMethod.value = "card")}
            >
              Card
            </button>
          </div>

          {paymentMethod.value === "cash" && (
            <div class="mb-2">
              <CashDrawer
                total={total}
                amountTendered={amountTendered.value}
                onChange$={(val: number) => (amountTendered.value = val)}
              />
              {change > 0 && (
                <p class="text-emerald-400 text-xs font-medium mt-1">
                  Change: ${(change / 100).toFixed(2)}
                </p>
              )}
            </div>
          )}

          <button
            class="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-base disabled:opacity-40 transition-colors"
            disabled={processing.value || items.length === 0}
            onClick$={processSale}
          >
            {processing.value ? "Processing..." : `Complete Sale  $${(total / 100).toFixed(2)}`}
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
