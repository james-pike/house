import { component$, useSignal } from "@builder.io/qwik";

export default component$(() => {
  const code = useSignal("");
  const result = useSignal<any>(null);
  const error = useSignal("");
  const token = useSignal("");
  const loading = useSignal(false);

  return (
    <div class="flex items-center justify-center h-full p-4">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md space-y-4">
        <h1 class="text-xl font-bold">Barcode Scanner</h1>
        <p class="text-sm text-gray-400">
          This view captures barcode scanner input. Barcode scanners act as
          keyboard input devices - they type the barcode value followed by Enter.
        </p>

        <div>
          <label class="block text-xs text-gray-400 mb-1">Auth Token</label>
          <input
            type="password"
            class="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm"
            placeholder="Admin JWT token"
            value={token.value}
            onInput$={(e) =>
              (token.value = (e.target as HTMLInputElement).value)
            }
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">
            Scan barcode or enter SKU
          </label>
          <input
            type="text"
            class="w-full bg-gray-700 text-white px-4 py-3 rounded-lg text-xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ready to scan..."
            value={code.value}
            autoFocus
            onInput$={(e) =>
              (code.value = (e.target as HTMLInputElement).value)
            }
            onKeyDown$={async (e) => {
              if (e.key !== "Enter" || !code.value.trim()) return;
              loading.value = true;
              error.value = "";
              result.value = null;
              try {
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                };
                if (token.value) {
                  headers["Authorization"] = `Bearer ${token.value}`;
                }
                const res = await fetch(
                  `http://localhost:9000/admin/pos/products/barcode/${encodeURIComponent(code.value.trim())}`,
                  { headers, credentials: "include" }
                );
                if (!res.ok) {
                  error.value = `Not found: ${code.value}`;
                } else {
                  const data = await res.json();
                  result.value = data.variant;
                }
              } catch (err: any) {
                error.value = err.message;
              }
              code.value = "";
              loading.value = false;
            }}
          />
        </div>

        {loading.value && <p class="text-gray-400 text-sm">Looking up...</p>}

        {error.value && (
          <p class="text-red-400 text-sm">{error.value}</p>
        )}

        {result.value && (
          <div class="bg-gray-700 rounded-lg p-4">
            <h3 class="font-medium">{result.value.product?.title}</h3>
            <p class="text-sm text-gray-300">{result.value.title}</p>
            <p class="text-xs text-gray-400">SKU: {result.value.sku}</p>
            {result.value.prices?.[0] && (
              <p class="text-lg font-bold mt-2">
                {(result.value.prices[0].amount / 100).toFixed(2)}{" "}
                {result.value.prices[0].currency_code?.toUpperCase()}
              </p>
            )}
          </div>
        )}

        <a
          href="/pos"
          class="block text-center text-blue-400 hover:text-blue-300 text-sm"
        >
          Back to POS Terminal
        </a>
      </div>
    </div>
  );
});
