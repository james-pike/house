import { component$, useSignal, type QRL } from "@builder.io/qwik";

interface Props {
  token: string;
  onScan$: QRL<(variant: any) => void>;
  onError$: QRL<(msg: string) => void>;
}

export default component$<Props>(({ token, onScan$, onError$ }) => {
  const inputValue = useSignal("");
  const loading = useSignal(false);

  return (
    <div>
      <label class="block text-sm text-gray-400 mb-1">
        Scan Barcode / Enter SKU
      </label>
      <input
        type="text"
        class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Scan or type SKU..."
        value={inputValue.value}
        autoFocus
        onInput$={(e) =>
          (inputValue.value = (e.target as HTMLInputElement).value)
        }
        onKeyDown$={async (e) => {
          if (e.key !== "Enter" || !inputValue.value.trim()) return;
          loading.value = true;
          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(
              `http://localhost:9000/admin/pos/products/barcode/${encodeURIComponent(inputValue.value.trim())}`,
              { headers, credentials: "include" }
            );
            if (!res.ok) {
              onError$(`Product not found: ${inputValue.value}`);
              inputValue.value = "";
              loading.value = false;
              return;
            }
            const data = await res.json();
            onScan$(data.variant);
            inputValue.value = "";
          } catch (err: any) {
            onError$(err.message);
          }
          loading.value = false;
        }}
      />
      {loading.value && (
        <p class="text-xs text-gray-400 mt-1">Looking up...</p>
      )}
    </div>
  );
});
