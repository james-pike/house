import { component$, useSignal, type QRL, $, useVisibleTask$ } from "@builder.io/qwik";

interface Props {
  token: string;
  backendUrl: string;
  onScan$: QRL<(variant: any) => void>;
  onError$: QRL<(msg: string) => void>;
  /** If true, show "not found" as an event instead of error */
  onNotFound$?: QRL<(code: string) => void>;
}

export default component$<Props>(({ token, backendUrl, onScan$, onError$, onNotFound$ }) => {
  const inputValue = useSignal("");
  const loading = useSignal(false);
  const cameraActive = useSignal(false);
  const scannerRef = useSignal<any>(undefined);

  // Clean up scanner on unmount
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    cleanup(() => {
      if (scannerRef.value) {
        try {
          scannerRef.value.stop().catch(() => {});
        } catch { /* ignore */ }
      }
    });
  });

  const lookup = $(async (code: string) => {
    if (!code.trim()) return;
    loading.value = true;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        `${backendUrl}/admin/pos/products/barcode/${encodeURIComponent(code.trim())}`,
        { headers, credentials: "include" }
      );
      if (res.status === 404) {
        if (onNotFound$) {
          onNotFound$(code.trim());
        } else {
          onError$(`Product not found: ${code}`);
        }
        inputValue.value = "";
        loading.value = false;
        return;
      }
      if (!res.ok) {
        onError$(`Lookup failed (${res.status})`);
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
  });

  const stopCamera = $(async () => {
    if (scannerRef.value) {
      try {
        await scannerRef.value.stop();
      } catch { /* ignore */ }
      scannerRef.value = undefined;
    }
    cameraActive.value = false;
  });

  const startCameraScan = $(async () => {
    try {
      cameraActive.value = true;

      // Dynamic import to keep it client-side only
      const { Html5Qrcode } = await import("html5-qrcode");

      // Wait for the scanner container to render
      await new Promise((r) => setTimeout(r, 100));

      const scannerId = "barcode-scanner-region";
      const el = document.getElementById(scannerId);
      if (!el) {
        cameraActive.value = false;
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.value = html5QrCode;

      let found = false;
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.0,
        },
        async (decodedText: string) => {
          if (found) return;
          found = true;
          await stopCamera();
          inputValue.value = decodedText;
          await lookup(decodedText);
        },
        () => {
          // Ignore scan failures (no code detected yet)
        }
      );

      // Auto-stop after 45 seconds
      setTimeout(() => {
        if (!found && cameraActive.value) {
          stopCamera();
        }
      }, 45000);
    } catch {
      await stopCamera();
      onError$("Camera not available. Type barcode manually.");
    }
  });

  return (
    <>
      {/* Bottom bar: input + scan button */}
      <div class="flex gap-2 items-center">
        <input
          type="text"
          class="flex-1 min-w-0 bg-gray-800 text-white px-3 py-2.5 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
          placeholder={loading.value ? "Looking up..." : "Barcode / SKU..."}
          value={inputValue.value}
          autoFocus
          onInput$={(e) =>
            (inputValue.value = (e.target as HTMLInputElement).value)
          }
          onKeyDown$={async (e) => {
            if (e.key !== "Enter" || !inputValue.value.trim()) return;
            await lookup(inputValue.value.trim());
          }}
        />
        <button
          class={`shrink-0 ${
            cameraActive.value
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white rounded-lg flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold active:scale-95 transition-transform`}
          onClick$={cameraActive.value ? stopCamera : startCameraScan}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            {cameraActive.value ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </>
            )}
          </svg>
          {cameraActive.value ? "Stop" : "Scan"}
        </button>
      </div>

      {/* Full-screen camera overlay */}
      {cameraActive.value && (
        <div class="fixed inset-0 z-50 bg-black flex flex-col">
          <div class="bg-gray-900 px-4 py-3 flex items-center justify-between shrink-0">
            <h2 class="text-white font-bold text-lg">Scan Barcode</h2>
            <button
              class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
              onClick$={stopCamera}
            >
              Cancel
            </button>
          </div>
          <div class="flex-1 flex items-center justify-center overflow-hidden">
            <div id="barcode-scanner-region" class="w-full h-full" />
          </div>
          <div class="bg-gray-900 px-4 py-3 text-center shrink-0">
            <p class="text-blue-300 text-sm animate-pulse">
              Point camera at barcode or QR code...
            </p>
          </div>
        </div>
      )}
    </>
  );
});
