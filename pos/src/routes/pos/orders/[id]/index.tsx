import { component$, useSignal, useStore, useContext, $, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation, useNavigate } from "@builder.io/qwik-city";
import { PosConfigContext } from "../../layout";
import BarcodeInput from "../../../../components/pos/barcode-input";

interface Line {
  id: string;
  item_name: string | null;
  sku: string | null;
  description: string | null;
  unit_cost: number | string;
  variant_id: string | null;
  closed: boolean;
  ordered: number;
  received: number;
  remaining: number;
  over: number;
  backordered: number;
  matched: boolean;
  status: "pending" | "partial" | "received" | "over" | "closed";
  receipts: { qty: number; received_at: string }[];
}
interface Po {
  id: string;
  doc_number: string | null;
  vendor_name: string | null;
  txn_date: string | null;
  closed: boolean;
  receive_status: string;
  has_backorder: boolean;
  has_unmatched: boolean;
  lines: Line[];
}

const LINE_STYLE: Record<string, string> = {
  pending: "text-gray-400",
  partial: "text-amber-300",
  received: "text-emerald-300",
  over: "text-orange-300",
  closed: "text-slate-400",
};

export default component$(() => {
  const posConfig = useContext(PosConfigContext);
  const loc = useLocation();
  const nav = useNavigate();
  const poId = loc.params.id;

  const token = useSignal("");
  const loading = useSignal(true);
  const busy = useSignal(false);
  const error = useSignal("");
  const toast = useSignal("");
  const store = useStore<{ po: Po | null }>({ po: null });

  const selectedId = useSignal<string>("");
  const qty = useSignal(1);
  const linkBarcode = useSignal("");
  const overConfirm = useSignal<{ message: string } | null>(null);

  const flash = $((msg: string) => {
    toast.value = msg;
    setTimeout(() => (toast.value = ""), 2500);
  });

  const load = $(async () => {
    error.value = "";
    try {
      const res = await fetch(`${posConfig.backendUrl}/admin/pos/purchase-orders/${poId}`, {
        headers: { Authorization: `Bearer ${token.value}` },
        credentials: "include",
      });
      if (res.status === 401) { error.value = "Not logged in. Open the Login tab first."; loading.value = false; return; }
      if (!res.ok) { error.value = `Failed to load PO (${res.status})`; loading.value = false; return; }
      const data = await res.json();
      store.po = data.purchase_order;
    } catch (e: any) { error.value = e.message; }
    loading.value = false;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    token.value = localStorage.getItem("pos_token") || "";
    await load();
  });

  const selectLine = $((line: Line) => {
    if (line.closed) return;
    selectedId.value = line.id;
    qty.value = line.remaining > 0 ? line.remaining : 1;
    linkBarcode.value = "";
    overConfirm.value = null;
  });

  const doReceive = $(async (allowOver: boolean) => {
    const po = store.po;
    if (!po) return;
    const line = po.lines.find((l) => l.id === selectedId.value);
    if (!line) return;
    if (qty.value <= 0) { flash("Enter a quantity"); return; }
    busy.value = true;
    try {
      const body: any = { po_line_id: line.id, quantity: qty.value };
      if (allowOver) body.allow_over = true;
      if (!line.matched && linkBarcode.value.trim()) body.barcode = linkBarcode.value.trim();

      const res = await fetch(`${posConfig.backendUrl}/admin/pos/purchase-orders/${poId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.value}` },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        flash(`Received ${qty.value} · ${line.item_name ?? "item"}`);
        selectedId.value = "";
        overConfirm.value = null;
        await load();
      } else if (data.code === "over_receipt") {
        overConfirm.value = { message: data.message };
      } else if (data.code === "unmatched_line") {
        flash("Scan or enter the item barcode to link this line first.");
      } else {
        flash(data.message || `Receive failed (${res.status})`);
      }
    } catch (e: any) {
      flash(e.message);
    }
    busy.value = false;
  });

  // Scan handler: BarcodeInput looked up a variant — find the line it belongs to.
  const onScan = $((variant: any) => {
    const po = store.po;
    if (!po) return;
    const open = po.lines.filter((l) => !l.closed);
    let line = open.find((l) => l.variant_id && l.variant_id === variant.id);
    if (!line) {
      // Unmatched line whose QB SKU equals the scanned barcode/sku.
      line = open.find((l) => !l.matched && (l.sku === variant.barcode || l.sku === variant.sku));
      if (line) linkBarcode.value = variant.barcode || variant.sku || "";
    }
    if (!line) { flash("Scanned item isn't on this PO"); return; }
    selectedId.value = line.id;
    qty.value = line.remaining > 0 ? line.remaining : 1;
    overConfirm.value = null;
  });

  const closePo = $(async () => {
    if (!confirm("Close this PO? Any unreceived quantity will be cancelled (backorders cleared).")) return;
    busy.value = true;
    try {
      const res = await fetch(`${posConfig.backendUrl}/admin/pos/purchase-orders/${poId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.value}` },
        credentials: "include",
        body: JSON.stringify({ close_lines: true }),
      });
      if (res.ok) { flash("PO closed"); await load(); }
      else flash(`Close failed (${res.status})`);
    } catch (e: any) { flash(e.message); }
    busy.value = false;
  });

  const po = () => store.po;

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div class="shrink-0 px-3 pt-3 pb-2 border-b border-gray-800 flex items-center gap-2">
        <button class="text-gray-400 hover:text-white text-sm" onClick$={() => nav("/pos/orders")}>← Back</button>
        <div class="min-w-0 flex-1">
          <div class="font-bold text-white truncate">{po()?.vendor_name || "Purchase Order"}</div>
          <div class="text-xs text-gray-500">PO #{po()?.doc_number || "—"} · {po()?.receive_status}</div>
        </div>
        {po() && !po()!.closed && (
          <button class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg" onClick$={closePo} disabled={busy.value}>
            Close PO
          </button>
        )}
      </div>

      {toast.value && (
        <div class="shrink-0 mx-3 mt-2 bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2">{toast.value}</div>
      )}
      {error.value && (
        <div class="shrink-0 mx-3 mt-2 bg-rose-900/40 border border-rose-700 text-rose-200 text-sm rounded-lg p-3">{error.value}</div>
      )}

      {/* Lines */}
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        {loading.value && <p class="text-gray-500 text-sm text-center py-8">Loading…</p>}
        {po()?.lines.map((line) => (
          <div
            key={line.id}
            class={`rounded-xl border p-3 ${
              selectedId.value === line.id ? "border-amber-500 bg-gray-900" : "border-gray-800 bg-gray-900"
            } ${line.closed ? "opacity-60" : ""}`}
          >
            <button class="w-full text-left" onClick$={() => selectLine(line)} disabled={line.closed}>
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-semibold text-white truncate">{line.item_name || "Item"}</div>
                  <div class="text-xs text-gray-500">
                    SKU {line.sku || "—"}
                    {!line.matched && <span class="ml-1 text-rose-400 font-bold">· UNMATCHED</span>}
                  </div>
                </div>
                <div class={`shrink-0 text-right ${LINE_STYLE[line.status]}`}>
                  <div class="text-sm font-bold">{line.received}/{line.ordered}</div>
                  <div class="text-[10px] uppercase font-semibold">
                    {line.closed ? "closed" : line.status}
                  </div>
                </div>
              </div>
              {/* progress bar */}
              <div class="mt-2 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  class={`h-full ${line.over ? "bg-orange-500" : line.status === "received" ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(100, line.ordered ? (line.received / line.ordered) * 100 : 0)}%` }}
                />
              </div>
              <div class="mt-1 flex gap-2 text-[11px] text-gray-500">
                {line.backordered > 0 && <span class="text-amber-400">{line.backordered} backordered</span>}
                {line.over > 0 && <span class="text-orange-400">{line.over} over</span>}
                {line.receipts.length > 0 && <span>{line.receipts.length} receipt{line.receipts.length > 1 ? "s" : ""}</span>}
              </div>
            </button>

            {/* Receive panel for the selected line */}
            {selectedId.value === line.id && !line.closed && (
              <div class="mt-3 pt-3 border-t border-gray-800">
                {!line.matched && (
                  <input
                    type="text"
                    placeholder="Scan / enter barcode to link this line"
                    class="w-full mb-2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-rose-700/50 focus:border-amber-500 focus:outline-none"
                    value={linkBarcode.value}
                    onInput$={(e) => (linkBarcode.value = (e.target as HTMLInputElement).value)}
                  />
                )}
                <div class="flex items-center gap-2">
                  <button class="w-9 h-9 rounded-lg bg-gray-800 text-white text-xl font-bold" onClick$={() => (qty.value = Math.max(1, qty.value - 1))}>−</button>
                  <input
                    type="number"
                    class="w-16 text-center bg-gray-800 text-white px-2 py-2 rounded-lg text-base border border-gray-700 focus:outline-none"
                    value={qty.value}
                    onInput$={(e) => (qty.value = parseInt((e.target as HTMLInputElement).value) || 0)}
                  />
                  <button class="w-9 h-9 rounded-lg bg-gray-800 text-white text-xl font-bold" onClick$={() => (qty.value = qty.value + 1)}>+</button>
                  {line.remaining > 0 && (
                    <button class="text-xs bg-gray-800 text-gray-300 px-2 py-2 rounded-lg" onClick$={() => (qty.value = line.remaining)}>
                      All {line.remaining}
                    </button>
                  )}
                  <button
                    class="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg active:scale-95 transition-transform"
                    onClick$={() => doReceive(false)}
                    disabled={busy.value}
                  >
                    Receive
                  </button>
                </div>

                {overConfirm.value && (
                  <div class="mt-2 bg-orange-950/50 border border-orange-700 rounded-lg p-2.5">
                    <p class="text-orange-200 text-xs mb-2">{overConfirm.value.message}</p>
                    <div class="flex gap-2">
                      <button class="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold py-1.5 rounded-lg" onClick$={() => doReceive(true)} disabled={busy.value}>
                        Over-receive anyway
                      </button>
                      <button class="px-3 bg-gray-800 text-gray-300 text-sm py-1.5 rounded-lg" onClick$={() => (overConfirm.value = null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {line.closed && <p class="text-xs text-slate-500 mt-1">Line closed.</p>}
              </div>
            )}

            {!line.matched && selectedId.value !== line.id && !line.closed && (
              <button class="mt-2 text-xs text-rose-400 font-semibold" onClick$={() => selectLine(line)}>
                Link & receive →
              </button>
            )}
          </div>
        ))}
        {!loading.value && po() && po()!.lines.length === 0 && (
          <p class="text-gray-500 text-sm text-center py-8">This PO has no item lines.</p>
        )}
      </div>

      {/* Scan bar */}
      {po() && !po()!.closed && (
        <div class="shrink-0 border-t border-gray-800 bg-gray-900 p-2">
          <BarcodeInput
            token={token.value}
            backendUrl={posConfig.backendUrl}
            onScan$={onScan}
            onError$={flash}
            onNotFound$={(code) => flash(`Unknown barcode: ${code}`)}
          />
        </div>
      )}
    </div>
  );
});
