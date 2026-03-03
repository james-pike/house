import { component$, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";

interface ReceivedItem {
  product_title: string;
  variant_title: string;
  sku: string;
  barcode: string;
  quantity_added: number;
  new_stock: number;
}

// Mobile breakpoint handled via Tailwind classes

export default component$(() => {
  const token = useSignal("");
  const scanInput = useSignal("");

  // Auto-load auth token from localStorage
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const savedToken = localStorage.getItem("pos_token");
    if (savedToken) token.value = savedToken;
  });
  const loading = useSignal(false);
  const error = useSignal("");
  const message = useSignal("");
  const locationId = useSignal("sloc_01KJP8SA4EC9WBNMED9X7REHTW");
  const salesChannelId = useSignal("");

  // Scanned product state
  const scannedVariant = useSignal<any>(null);
  const receiveQty = useSignal(1);

  // New product form
  const showNewForm = useSignal(false);
  const newTitle = useSignal("");
  const newPrice = useSignal("");
  const newBarcode = useSignal("");
  const newQty = useSignal(1);

  // Camera scanning
  const cameraActive = useSignal(false);

  // History of received items this session
  const received = useStore<ReceivedItem[]>([]);
  const showLog = useSignal(false);

  const startCameraScan = $(async () => {
    const win = window as any;
    if ("BarcodeDetector" in window) {
      try {
        cameraActive.value = true;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        const detector = new win.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        let found = false;
        const scanLoop = async () => {
          if (!cameraActive.value || found) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              found = true;
              const code = barcodes[0].rawValue;
              stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
              cameraActive.value = false;
              scanInput.value = code;
              await lookupBarcode(code);
              return;
            }
          } catch { /* ignore */ }
          if (!found) requestAnimationFrame(scanLoop);
        };
        scanLoop();
        setTimeout(() => {
          if (!found) {
            stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
            cameraActive.value = false;
          }
        }, 15000);
      } catch {
        cameraActive.value = false;
        error.value = "Camera not available. Type barcode manually.";
      }
    } else {
      error.value = "Camera scan not supported on this browser. Use a USB/Bluetooth scanner or type the barcode.";
    }
  });

  const lookupBarcode = $(async (code: string) => {
    loading.value = true;
    error.value = "";
    scannedVariant.value = null;
    showNewForm.value = false;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token.value) headers["Authorization"] = `Bearer ${token.value}`;

      const res = await fetch(
        `http://localhost:9000/admin/pos/products/barcode/${encodeURIComponent(code)}`,
        { headers, credentials: "include" }
      );

      if (res.status === 404) {
        // Product not found — show new product form
        showNewForm.value = true;
        newBarcode.value = code;
        newTitle.value = "";
        newPrice.value = "";
        newQty.value = 1;
        message.value = `"${code}" not found — add as new product below`;
      } else if (!res.ok) {
        throw new Error(await res.text());
      } else {
        const data = await res.json();
        scannedVariant.value = data.variant;
        receiveQty.value = 1;
        message.value = "";
      }
    } catch (err: any) {
      error.value = err.message;
    }
    loading.value = false;
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

      const res = await fetch("http://localhost:9000/admin/pos/receive", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          variant_id: scannedVariant.value.id,
          quantity: receiveQty.value,
          location_id: locationId.value,
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
      scanInput.value = "";
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
        "http://localhost:9000/admin/pos/receive/new-product",
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            title: newTitle.value,
            barcode: newBarcode.value || undefined,
            price: Math.round(parseFloat(newPrice.value) * 100),
            currency_code: "cad",
            quantity: newQty.value,
            location_id: locationId.value,
            sales_channel_id: salesChannelId.value || undefined,
          }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      received.unshift({
        product_title: data.product.title,
        variant_title: "Default",
        sku: data.product.sku,
        barcode: data.product.barcode || "",
        quantity_added: data.quantity_stocked,
        new_stock: data.quantity_stocked,
      });

      message.value = `NEW PRODUCT created: ${data.product.title} — ${data.quantity_stocked} in stock`;
      showNewForm.value = false;
      newTitle.value = "";
      newPrice.value = "";
      newBarcode.value = "";
      scanInput.value = "";
    } catch (err: any) {
      error.value = err.message;
    }
    loading.value = false;
  });

  return (
    <div class="flex h-full relative">
      {/* Left: Scanner + action */}
      <div class="flex-1 p-4 md:p-6 overflow-auto">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold">Receive Inventory</h1>
          <button
            class="lg:hidden bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm"
            onClick$={() => (showLog.value = !showLog.value)}
          >
            Log ({received.length})
          </button>
        </div>

        {!token.value && (
          <p class="text-yellow-400 text-sm mb-4">
            Not logged in — <a href="/pos/session" class="underline">open a session</a> first
          </p>
        )}

        {/* Barcode scanner input */}
        <div class="mb-6">
          <label class="block text-sm text-gray-400 mb-1">
            Scan Barcode / Enter SKU
          </label>
          <div class="flex gap-2">
            <input
              type="text"
              class="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg text-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Scan or type barcode..."
              value={scanInput.value}
              autoFocus
              onInput$={(e) =>
                (scanInput.value = (e.target as HTMLInputElement).value)
              }
              onKeyDown$={(e) => {
                if (e.key === "Enter" && scanInput.value.trim()) {
                  lookupBarcode(scanInput.value.trim());
                }
              }}
            />
            <button
              class={`${cameraActive.value ? "bg-red-600 hover:bg-red-700" : "bg-yellow-600 hover:bg-yellow-700"} text-white px-4 py-3 rounded-lg shrink-0 flex items-center gap-1.5`}
              onClick$={() => (cameraActive.value ? (cameraActive.value = false) : startCameraScan())}
              title={cameraActive.value ? "Stop camera" : "Scan with camera"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="3" height="3" />
                <line x1="20" y1="14" x2="20" y2="14.01" />
                <line x1="14" y1="20" x2="14" y2="20.01" />
                <line x1="20" y1="20" x2="20" y2="20.01" />
                <line x1="20" y1="17" x2="20" y2="17.01" />
                <line x1="17" y1="20" x2="17" y2="20.01" />
              </svg>
              <span class="hidden sm:inline text-sm font-medium">
                {cameraActive.value ? "Stop" : "Scan"}
              </span>
            </button>
          </div>
          {loading.value && (
            <p class="text-xs text-gray-400 mt-1">Looking up...</p>
          )}
          {cameraActive.value && (
            <p class="text-xs text-yellow-400 mt-1 animate-pulse">
              Camera active — point at barcode...
            </p>
          )}
        </div>

        {/* Found product — receive stock */}
        {scannedVariant.value && (
          <div class="bg-gray-800 rounded-xl p-5 mb-4 border border-gray-700">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h2 class="text-lg font-bold">
                  {scannedVariant.value.product?.title}
                </h2>
                <p class="text-sm text-gray-400">
                  {scannedVariant.value.title} — SKU:{" "}
                  {scannedVariant.value.sku || "—"}
                </p>
                {scannedVariant.value.inventory_items?.[0]?.inventory
                  ?.location_levels?.[0] && (
                  <p class="text-sm text-gray-500 mt-1">
                    Current stock:{" "}
                    {
                      scannedVariant.value.inventory_items[0].inventory
                        .location_levels[0].stocked_quantity
                    }
                  </p>
                )}
              </div>
              {scannedVariant.value.prices?.[0] && (
                <p class="text-xl font-bold">
                  $
                  {(scannedVariant.value.prices[0].amount / 100).toFixed(2)}{" "}
                  CAD
                </p>
              )}
            </div>

            <div class="flex flex-wrap items-end gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">
                  Quantity to receive
                </label>
                <input
                  type="number"
                  class="w-28 bg-gray-700 text-white px-3 py-2 rounded text-lg text-center"
                  min={1}
                  value={receiveQty.value}
                  onInput$={(e) =>
                    (receiveQty.value =
                      parseInt((e.target as HTMLInputElement).value) || 1)
                  }
                />
              </div>
              <div class="flex flex-wrap gap-2">
                {[1, 5, 10, 25, 50].map((n) => (
                  <button
                    key={n}
                    class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
                    onClick$={() => (receiveQty.value = n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                class="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-bold text-lg disabled:opacity-50 sm:ml-auto"
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
          <div class="bg-gray-800 rounded-xl p-5 mb-4 border border-yellow-600">
            <h2 class="text-lg font-bold mb-3 text-yellow-400">
              New Product
            </h2>
            <p class="text-sm text-gray-400 mb-4">
              Barcode <span class="text-white font-mono">{newBarcode.value}</span> not found. Create it:
            </p>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  class="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  placeholder="e.g. Blue T-Shirt Large"
                  value={newTitle.value}
                  onInput$={(e) =>
                    (newTitle.value = (e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="block text-xs text-gray-400 mb-1">
                    Price (CAD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="w-full bg-gray-700 text-white px-3 py-2 rounded"
                    placeholder="29.99"
                    value={newPrice.value}
                    onInput$={(e) =>
                      (newPrice.value = (e.target as HTMLInputElement).value)
                    }
                  />
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-gray-400 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    class="w-full bg-gray-700 text-white px-3 py-2 rounded"
                    min={0}
                    value={newQty.value}
                    onInput$={(e) =>
                      (newQty.value =
                        parseInt((e.target as HTMLInputElement).value) || 0)
                    }
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">
                  Barcode / UPC
                </label>
                <input
                  type="text"
                  class="w-full bg-gray-700 text-white px-3 py-2 rounded font-mono"
                  value={newBarcode.value}
                  onInput$={(e) =>
                    (newBarcode.value = (e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div class="flex gap-3 pt-2">
                <button
                  class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-bold disabled:opacity-50"
                  disabled={loading.value}
                  onClick$={createNewProduct}
                >
                  {loading.value ? "Creating..." : "Create & Receive"}
                </button>
                <button
                  class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg"
                  onClick$={() => {
                    showNewForm.value = false;
                    scanInput.value = "";
                    message.value = "";
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error.value && (
          <p class="text-red-400 text-sm mb-3">{error.value}</p>
        )}
        {message.value && (
          <p class="text-yellow-300 text-sm mb-3">{message.value}</p>
        )}
      </div>

      {/* Right: Receive log — hidden on mobile, toggleable */}
      <div class={`${showLog.value ? "fixed inset-0 z-40" : "hidden"} lg:relative lg:block lg:z-auto w-full lg:w-[380px] bg-gray-800 border-l border-gray-700 flex flex-col`}>
        <div class="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 class="font-bold text-sm uppercase tracking-wide text-gray-400">
            Received This Session ({received.length})
          </h2>
          <button
            class="lg:hidden text-gray-400 hover:text-white text-sm"
            onClick$={() => (showLog.value = false)}
          >
            Close
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          {received.length === 0 ? (
            <p class="text-gray-500 text-sm text-center py-8">
              Scan products to receive inventory
            </p>
          ) : (
            <div class="space-y-2">
              {received.map((item, i) => (
                <div
                  key={i}
                  class="bg-gray-700 rounded-lg p-3"
                >
                  <div class="flex justify-between items-start">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium truncate">
                        {item.product_title}
                      </p>
                      <p class="text-xs text-gray-400">
                        {item.sku}
                        {item.barcode ? ` | ${item.barcode}` : ""}
                      </p>
                    </div>
                    <div class="text-right ml-3">
                      <p class="text-green-400 font-bold text-sm">
                        +{item.quantity_added}
                      </p>
                      <p class="text-xs text-gray-400">
                        Stock: {item.new_stock}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div class="p-4 border-t border-gray-700">
          <p class="text-sm text-gray-400">
            Total received:{" "}
            <span class="text-white font-bold">
              {received.reduce((s, i) => s + i.quantity_added, 0)} units
            </span>
          </p>
        </div>
      </div>
    </div>
  );
});
