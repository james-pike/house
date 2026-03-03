import { component$, useSignal, type QRL, $ } from "@builder.io/qwik";

interface Props {
  token: string;
  onScan$: QRL<(variant: any) => void>;
  onError$: QRL<(msg: string) => void>;
}

export default component$<Props>(({ token, onScan$, onError$ }) => {
  const inputValue = useSignal("");
  const loading = useSignal(false);
  const cameraActive = useSignal(false);

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
        `http://localhost:9000/admin/pos/products/barcode/${encodeURIComponent(code.trim())}`,
        { headers, credentials: "include" }
      );
      if (!res.ok) {
        onError$(`Product not found: ${code}`);
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

  const startCameraScan = $(async () => {
    // Use the BarcodeDetector API if available (Chrome/Edge on Android)
    const win = window as any;
    if ("BarcodeDetector" in window) {
      try {
        cameraActive.value = true;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        // Create a temporary video element
        const video = document.createElement("video");
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();

        const detector = new win.BarcodeDetector({
          formats: [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "qr_code",
          ],
        });

        // Scan in a loop until we find a barcode
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
              inputValue.value = code;
              await lookup(code);
              return;
            }
          } catch {
            // ignore detection errors
          }
          if (!found) {
            requestAnimationFrame(scanLoop);
          }
        };
        scanLoop();

        // Auto-stop after 15 seconds
        setTimeout(() => {
          if (!found) {
            stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
            cameraActive.value = false;
          }
        }, 15000);
      } catch {
        cameraActive.value = false;
        // Fallback: just focus the text input
        onError$("Camera not available. Type barcode manually.");
      }
    } else {
      // No BarcodeDetector — try the simpler approach with an input capture
      // This triggers the phone's built-in barcode/QR scanner on some devices
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.capture = "environment";
      fileInput.onchange = async () => {
        if (fileInput.files && fileInput.files[0]) {
          // On devices without BarcodeDetector, prompt user to type the code
          onError$(
            "Camera scan not supported on this browser. Use a USB/Bluetooth scanner or type the barcode."
          );
        }
      };
      fileInput.click();
    }
  });

  const stopCamera = $(() => {
    cameraActive.value = false;
  });

  return (
    <div class="flex-1">
      <label class="block text-sm text-gray-400 mb-1">
        Scan Barcode / Enter SKU
      </label>
      <div class="flex gap-2">
        <input
          type="text"
          class="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Scan or type SKU..."
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
        {/* Camera scan button — most useful on mobile */}
        <button
          class={`${cameraActive.value ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} text-white px-3 py-2 rounded-lg shrink-0 flex items-center gap-1.5`}
          onClick$={cameraActive.value ? stopCamera : startCameraScan}
          title={cameraActive.value ? "Stop camera" : "Scan with camera"}
        >
          {/* QR/barcode icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
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
          <span class="hidden sm:inline text-sm">
            {cameraActive.value ? "Stop" : "Scan"}
          </span>
        </button>
      </div>
      {loading.value && (
        <p class="text-xs text-gray-400 mt-1">Looking up...</p>
      )}
      {cameraActive.value && (
        <p class="text-xs text-blue-400 mt-1 animate-pulse">
          Camera active — point at barcode...
        </p>
      )}
    </div>
  );
});
