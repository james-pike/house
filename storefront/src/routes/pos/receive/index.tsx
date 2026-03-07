import { component$, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { useContext } from "@builder.io/qwik";
import { PosConfigContext } from "../layout";
import BarcodeInput from "~/components/pos/barcode-input";

interface ReceivedItem {
  product_title: string;
  variant_title: string;
  sku: string;
  barcode: string;
  quantity_added: number;
  new_stock: number;
}

export default component$(() => {
  const posConfig = useContext(PosConfigContext);
  const token = useSignal("");
  const categories = useSignal<{ id: string; name: string; handle: string }[]>([]);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const savedToken = localStorage.getItem("pos_token");
    if (savedToken) {
      token.value = savedToken;
      // Load categories
      try {
        const res = await fetch(`${posConfig.backendUrl}/admin/pos/categories`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          categories.value = data.categories || [];
        }
      } catch (e) { console.error("Failed to load categories:", e); }
    }
  });

  const loading = useSignal(false);
  const error = useSignal("");
  const message = useSignal("");

  // Scanned product state
  const scannedVariant = useSignal<any>(null);
  const receiveQty = useSignal(1);

  // New product form
  const showNewForm = useSignal(false);
  const newTitle = useSignal("");
  const newPrice = useSignal("");
  const newBarcode = useSignal("");
  const newQty = useSignal(1);
  const newCategoryId = useSignal("");
  const newSize = useSignal("");

  // History of received items this session
  const received = useStore<ReceivedItem[]>([]);
  const showLog = useSignal(false);

  // UPC lookup autofill data
  const upcData = useSignal<any>(null);

  const handleScan = $((variant: any) => {
    scannedVariant.value = variant;
    receiveQty.value = 1;
    showNewForm.value = false;
    error.value = "";
    message.value = "";
    upcData.value = null;
  });

  const handleNotFound = $(async (code: string) => {
    scannedVariant.value = null;
    showNewForm.value = true;
    newBarcode.value = code;
    newTitle.value = "";
    newPrice.value = "";
    newQty.value = 1;
    newCategoryId.value = "";
    newSize.value = "";
    error.value = "";
    upcData.value = null;

    // Check distributor UPC lookup for autofill
    try {
      const headers: Record<string, string> = {};
      if (token.value) headers["Authorization"] = `Bearer ${token.value}`;
      const res = await fetch(
        `${posConfig.backendUrl}/admin/pos/upc-lookup/${encodeURIComponent(code)}`,
        { headers, credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        const d = data.upc_data;
        upcData.value = d;
        newTitle.value = d.suggested_title || d.title || "";
        newPrice.value = d.wholesale_price ? d.wholesale_price.toFixed(2) : "";
        newSize.value = d.size || "";
        if (d.category_id) newCategoryId.value = d.category_id;
        message.value = `"${code}" not found but matched distributor catalog — fields auto-filled`;
        return;
      }
    } catch {
      // UPC lookup failed, fall through to manual entry
    }

    message.value = `"${code}" not found — add as new product or new size below`;
  });

  const handleError = $((msg: string) => {
    error.value = msg;
  });

  const receiveStock = $(async () => {
    if (!scannedVariant.value || receiveQty.value <= 0) return;
    loading.value = true;
    error.value = "";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token.value) headers["Authorization"] = `Bearer ${token.value}`;

      const res = await fetch(`${posConfig.backendUrl}/admin/pos/receive`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          variant_id: scannedVariant.value.id,
          quantity: receiveQty.value,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      received.unshift({
        product_title: data.variant.product_title || "",
        variant_title: data.variant.title || "",
        sku: data.variant.sku || "",
        barcode: data.variant.barcode || "",
        quantity_added: data.quantity_added,
        new_stock: data.inventory_level?.stocked_quantity || 0,
      });

      message.value = `+${data.quantity_added} received for ${data.variant.product_title} — now ${data.inventory_level?.stocked_quantity} in stock`;
      scannedVariant.value = null;
    } catch (err: any) {
      error.value = err.message;
    }
    loading.value = false;
  });

  const createNewProduct = $(async () => {
    if (!newTitle.value || !newPrice.value) {
      error.value = "Title and price are required";
      return;
    }
    loading.value = true;
    error.value = "";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token.value) headers["Authorization"] = `Bearer ${token.value}`;

      const res = await fetch(
        `${posConfig.backendUrl}/admin/pos/receive/new-product`,
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            title: newTitle.value,
            barcode: newBarcode.value || undefined,
            sku: upcData.value?.material_number || undefined,
            price: Math.round(parseFloat(newPrice.value) * 100),
            currency_code: "cad",
            quantity: newQty.value,
            category_id: newCategoryId.value || undefined,
            size: newSize.value || undefined,
            brand: upcData.value?.brand || undefined,
            color: upcData.value?.color || undefined,
            material_number: upcData.value?.material_number || undefined,
            width: upcData.value?.width || undefined,
          }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      received.unshift({
        product_title: data.product.title,
        variant_title: newSize.value || "Default",
        sku: data.product.sku,
        barcode: data.product.barcode || "",
        quantity_added: data.quantity_stocked,
        new_stock: data.quantity_stocked,
      });

      message.value = `NEW: ${data.product.title}${newSize.value ? ` (${newSize.value})` : ""} created — ${data.quantity_stocked} in stock`;
      showNewForm.value = false;
      newTitle.value = "";
      newPrice.value = "";
      newBarcode.value = "";
      newSize.value = "";
      upcData.value = null;
    } catch (err: any) {
      error.value = err.message;
    }
    loading.value = false;
  });

  return (
    <div class="flex h-full relative overflow-hidden max-w-[100vw]">
      {/* Left: Scanner + action */}
      <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Scrollable content */}
        <div class="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <img src="/logo.png" alt="Safety House" class="h-7 invert" />
            <span class="text-sm font-bold text-amber-400 uppercase tracking-wider">Receive</span>
          </div>
          <button
            class="lg:hidden bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
            onClick$={() => (showLog.value = !showLog.value)}
          >
            Log ({received.length})
          </button>
        </div>

        {!token.value && (
          <div class="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-2 rounded-lg mb-3">
            Not logged in — <a href="/pos/session" class="underline font-medium">open session</a>
          </div>
        )}

        {/* Messages */}
        {error.value && (
          <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg mb-3">
            {error.value}
          </div>
        )}
        {message.value && (
          <div class="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-3 py-2 rounded-lg mb-3">
            {message.value}
          </div>
        )}

        {/* Found product — receive stock */}
        {scannedVariant.value && (
          <div class="bg-gray-900 rounded-xl p-4 mb-3 border border-gray-800">
            <div class="flex items-start justify-between mb-3">
              <div class="min-w-0 flex-1">
                <h2 class="text-base font-bold truncate">
                  {scannedVariant.value.product?.title}
                </h2>
                <p class="text-xs text-gray-500">
                  {scannedVariant.value.title} — SKU: {scannedVariant.value.sku || "—"}
                </p>
                {scannedVariant.value.inventory_items?.[0]?.inventory
                  ?.location_levels?.[0] && (
                  <p class="text-xs text-gray-600 mt-0.5">
                    Current stock:{" "}
                    <span class="text-gray-400 font-medium">
                      {scannedVariant.value.inventory_items[0].inventory.location_levels[0].stocked_quantity}
                    </span>
                  </p>
                )}
              </div>
              {(() => {
                const v = scannedVariant.value;
                const price = v.price
                  ?? v.calculated_price?.calculated_amount
                  ?? (v.prices?.find((p: any) => p.currency_code === "cad") || v.prices?.[0])?.amount
                  ?? v.original_price;
                return price != null ? (
                  <p class="text-lg font-bold text-emerald-400 ml-3">
                    ${(price / 100).toFixed(2)}
                  </p>
                ) : null;
              })()}
            </div>

            <div class="flex flex-wrap items-end gap-2">
              <div>
                <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Qty</label>
                <input
                  type="number"
                  class="w-20 bg-gray-800 text-white px-2 py-1.5 rounded-lg text-base text-center border border-gray-700 focus:border-amber-500 focus:outline-none"
                  min={1}
                  value={receiveQty.value}
                  onInput$={(e) =>
                    (receiveQty.value = parseInt((e.target as HTMLInputElement).value) || 1)
                  }
                />
              </div>
              <div class="flex gap-1">
                {[1, 5, 10, 25, 50].map((n) => (
                  <button
                    key={n}
                    class={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      receiveQty.value === n
                        ? "bg-amber-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                    onClick$={() => (receiveQty.value = n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                class="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-40 transition-colors sm:ml-auto"
                disabled={loading.value}
                onClick$={receiveStock}
              >
                Receive +{receiveQty.value}
              </button>
            </div>
          </div>
        )}

        {/* New product form */}
        {showNewForm.value && (
          <div class="bg-gray-900 rounded-xl p-4 mb-3 border border-amber-600/40">

            {/* UPC matched — streamlined confirmation */}
            {upcData.value ? (
              <div class="space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Catalog Match</p>
                    <h3 class="text-base font-bold mt-0.5">{newTitle.value}</h3>
                    <p class="text-xs text-gray-400 mt-0.5">
                      {upcData.value.brand}
                      {upcData.value.color && <span> — {upcData.value.color}</span>}
                    </p>
                  </div>
                  <p class="text-lg font-bold text-emerald-400">${newPrice.value}</p>
                </div>

                <div class="flex flex-wrap gap-2 text-xs">
                  {upcData.value.size && (
                    <span class="bg-gray-800 text-white px-2.5 py-1 rounded-lg">
                      Size {upcData.value.size}{upcData.value.width ? ` ${upcData.value.width}` : ""}
                    </span>
                  )}
                  <span class="bg-gray-800 text-gray-500 px-2.5 py-1 rounded-lg font-mono text-[10px]">
                    {newBarcode.value}
                  </span>
                </div>

                <div>
                  <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Category</label>
                  <select
                    class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:border-amber-500 focus:outline-none"
                    value={newCategoryId.value}
                    onChange$={(e) => (newCategoryId.value = (e.target as HTMLSelectElement).value)}
                  >
                    <option value="">— No Category —</option>
                    {categories.value.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div class="flex items-end gap-2">
                  <div>
                    <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Qty</label>
                    <input
                      type="number"
                      class="w-20 bg-gray-800 text-white px-2 py-1.5 rounded-lg text-base text-center border border-gray-700 focus:border-amber-500 focus:outline-none"
                      min={0}
                      value={newQty.value}
                      onInput$={(e) => (newQty.value = parseInt((e.target as HTMLInputElement).value) || 0)}
                    />
                  </div>
                  <div class="flex gap-1">
                    {[1, 5, 10, 25].map((n) => (
                      <button
                        key={n}
                        class={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          newQty.value === n
                            ? "bg-amber-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                        onClick$={() => (newQty.value = n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div class="flex gap-2 pt-1">
                  <button
                    class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 transition-colors"
                    disabled={loading.value}
                    onClick$={createNewProduct}
                  >
                    {loading.value ? "Creating..." : `Create & Receive ×${newQty.value}`}
                  </button>
                  <button
                    class="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2.5 rounded-xl text-sm"
                    onClick$={() => {
                      showNewForm.value = false;
                      message.value = "";
                      upcData.value = null;
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Manual entry — no UPC match */
              <div class="space-y-2">
                <p class="text-xs text-gray-500 mb-2">
                  Barcode <span class="text-white font-mono text-[11px]">{newBarcode.value}</span> — not in catalog, enter manually.
                </p>
                <div>
                  <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Product Name *</label>
                  <input
                    type="text"
                    class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Carhartt Rugged Flex Boot"
                    value={newTitle.value}
                    onInput$={(e) => (newTitle.value = (e.target as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Category</label>
                  <select
                    class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:border-amber-500 focus:outline-none"
                    value={newCategoryId.value}
                    onChange$={(e) => (newCategoryId.value = (e.target as HTMLSelectElement).value)}
                  >
                    <option value="">— No Category —</option>
                    {categories.value.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Size selector — shows based on selected category */}
                {(() => {
                  const catHandle = categories.value.find((c) => c.id === newCategoryId.value)?.handle;
                  if (!catHandle) return null;

                  const isFootwear = catHandle === "safety-footwear";
                  const sizes = isFootwear
                    ? ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13", "14"]
                    : catHandle === "safety-supplies"
                      ? ["One Size", "S", "M", "L", "XL"]
                      : ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

                  return (
                    <div>
                      <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Size</label>
                      <div class="flex flex-wrap gap-1">
                        {sizes.map((s) => (
                          <button
                            key={s}
                            class={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              newSize.value === s
                                ? "bg-amber-600 text-white"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                            }`}
                            onClick$={() => (newSize.value = newSize.value === s ? "" : s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div class="flex gap-2">
                  <div class="flex-1">
                    <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Price (CAD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:border-amber-500 focus:outline-none"
                      placeholder="29.99"
                      value={newPrice.value}
                      onInput$={(e) => (newPrice.value = (e.target as HTMLInputElement).value)}
                    />
                  </div>
                  <div class="flex-1">
                    <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Qty</label>
                    <input
                      type="number"
                      class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:border-amber-500 focus:outline-none"
                      min={0}
                      value={newQty.value}
                      onInput$={(e) => (newQty.value = parseInt((e.target as HTMLInputElement).value) || 0)}
                    />
                  </div>
                </div>
                <div class="flex gap-2 pt-1">
                  <button
                    class="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 transition-colors"
                    disabled={loading.value}
                    onClick$={createNewProduct}
                  >
                    {loading.value ? "Creating..." : "Create & Receive"}
                  </button>
                  <button
                    class="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2.5 rounded-xl text-sm"
                    onClick$={() => {
                      showNewForm.value = false;
                      message.value = "";
                      upcData.value = null;
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Bottom: Scanner input pinned above tabs */}
        <div class="shrink-0 border-t border-gray-800 bg-gray-900 p-2">
          <BarcodeInput
            token={token.value}
            backendUrl={posConfig.backendUrl}
            onScan$={handleScan}
            onNotFound$={handleNotFound}
            onError$={handleError}
          />
        </div>
      </div>

      {/* Right: Receive log */}
      <div class={`${showLog.value ? "fixed inset-0 z-40" : "hidden"} lg:relative lg:block lg:z-auto w-full lg:w-[340px] lg:shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden`}>
        <div class="p-3 border-b border-gray-800 flex items-center justify-between">
          <h2 class="font-bold text-[10px] uppercase tracking-widest text-gray-500">
            Received ({received.length})
          </h2>
          <button
            class="lg:hidden text-gray-500 hover:text-white text-xs"
            onClick$={() => (showLog.value = false)}
          >
            Close
          </button>
        </div>
        <div class="flex-1 overflow-auto p-3">
          {received.length === 0 ? (
            <p class="text-gray-600 text-xs text-center py-8">
              Scan products to receive inventory
            </p>
          ) : (
            <div class="space-y-1.5">
              {received.map((item, i) => (
                <div key={i} class="bg-gray-800/50 rounded-lg p-2.5">
                  <div class="flex justify-between items-start">
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium truncate">{item.product_title}</p>
                      <p class="text-[10px] text-gray-500">
                        {item.sku}{item.barcode ? ` | ${item.barcode}` : ""}
                      </p>
                    </div>
                    <div class="text-right ml-2">
                      <p class="text-emerald-400 font-bold text-xs">+{item.quantity_added}</p>
                      <p class="text-[10px] text-gray-500">Stock: {item.new_stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div class="p-3 border-t border-gray-800">
          <p class="text-xs text-gray-500">
            Total:{" "}
            <span class="text-white font-bold">
              {received.reduce((s, i) => s + i.quantity_added, 0)} units
            </span>
          </p>
        </div>
      </div>
    </div>
  );
});
