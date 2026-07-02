import { component$, useSignal, useStore, useContext, $, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { PosConfigContext } from "../layout";

interface PoSummary {
  id: string;
  doc_number: string | null;
  vendor_name: string | null;
  txn_date: string | null;
  status: string;
  closed: boolean;
  line_count: number;
  matched_lines: number;
  unmatched_lines: number;
  receive_status: "pending" | "partial" | "received" | "closed";
  has_backorder: boolean;
  has_over: boolean;
  has_unmatched: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gray-700 text-gray-200",
  partial: "bg-amber-600/30 text-amber-300 border border-amber-600/40",
  received: "bg-emerald-600/30 text-emerald-300 border border-emerald-600/40",
  closed: "bg-slate-700 text-slate-300",
};

const FILTERS = ["all", "pending", "partial", "received", "closed"] as const;

export default component$(() => {
  const posConfig = useContext(PosConfigContext);
  const nav = useNavigate();
  const token = useSignal("");
  const loading = useSignal(true);
  const syncing = useSignal(false);
  const error = useSignal("");
  const filter = useSignal<(typeof FILTERS)[number]>("all");
  const state = useStore<{ orders: PoSummary[] }>({ orders: [] });
  const qb = useStore<{ connected: boolean; env: string }>({ connected: false, env: "" });
  const salesMsg = useSignal("");

  const loadStatus = $(async () => {
    try {
      const res = await fetch(`${posConfig.backendUrl}/admin/pos/quickbooks/status`, {
        headers: { Authorization: `Bearer ${token.value}` },
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        qb.connected = !!d.connected;
        qb.env = d.environment || "";
      }
    } catch { /* status is best-effort */ }
  });

  const connect = $(() => {
    window.open(`${posConfig.backendUrl}/quickbooks/connect`, "_blank");
  });

  const syncSales = $(async () => {
    salesMsg.value = "Pushing sales…";
    try {
      const res = await fetch(`${posConfig.backendUrl}/admin/pos/quickbooks/sync-sales`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.value}` },
        credentials: "include",
      });
      const d = await res.json();
      salesMsg.value = res.ok
        ? `Synced ${d.synced}, skipped ${d.skipped}, errors ${d.errors}`
        : d.message || "Sales sync failed";
    } catch (e: any) {
      salesMsg.value = e.message;
    }
    setTimeout(() => (salesMsg.value = ""), 4000);
  });

  const load = $(async () => {
    loading.value = true;
    error.value = "";
    try {
      const res = await fetch(`${posConfig.backendUrl}/admin/pos/purchase-orders`, {
        headers: { Authorization: `Bearer ${token.value}` },
        credentials: "include",
      });
      if (res.status === 401) {
        error.value = "Not logged in. Open the Login tab first.";
        loading.value = false;
        return;
      }
      const data = await res.json();
      state.orders = data.purchase_orders ?? [];
    } catch (e: any) {
      error.value = e.message;
    }
    loading.value = false;
  });

  const sync = $(async () => {
    syncing.value = true;
    error.value = "";
    try {
      const res = await fetch(`${posConfig.backendUrl}/admin/pos/quickbooks/sync-pos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.value}` },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        error.value = data.message || "Sync failed — is QuickBooks connected?";
      }
    } catch (e: any) {
      error.value = e.message;
    }
    syncing.value = false;
    await load();
    // Re-check connection: an auth failure clears it server-side, so this flips
    // the status strip to "not connected" and surfaces the Connect button.
    await loadStatus();
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    token.value = localStorage.getItem("pos_token") || "";
    await load();
    await loadStatus();
  });

  const visible = () =>
    filter.value === "all"
      ? state.orders
      : state.orders.filter((o) => o.receive_status === filter.value);

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div class="shrink-0 px-3 pt-3 pb-2 border-b border-gray-800">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-lg font-bold text-amber-400">Purchase Orders</h1>
          <button
            class="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            onClick$={sync}
            disabled={syncing.value}
          >
            {syncing.value ? "Syncing…" : "Sync from QuickBooks"}
          </button>
        </div>
        {/* QuickBooks status strip */}
        <div class="flex items-center justify-between mb-2 text-xs">
          <span class="flex items-center gap-1.5">
            <span class={`w-2 h-2 rounded-full ${qb.connected ? "bg-emerald-400" : "bg-rose-500"}`} />
            <span class="text-gray-400">
              QuickBooks: {qb.connected ? `connected · ${qb.env}` : "not connected"}
            </span>
          </span>
          {qb.connected ? (
            <button class="text-gray-300 bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded-lg font-semibold" onClick$={syncSales}>
              Push sales → QB
            </button>
          ) : (
            <button class="text-white bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded-lg font-semibold" onClick$={connect}>
              Connect
            </button>
          )}
        </div>
        {salesMsg.value && <p class="text-[11px] text-amber-300 mb-2">{salesMsg.value}</p>}

        {/* Filter chips */}
        <div class="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              class={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                filter.value === f ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
              onClick$={() => (filter.value = f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        {error.value && (
          <div class="bg-rose-900/40 border border-rose-700 text-rose-200 text-sm rounded-lg p-3">{error.value}</div>
        )}
        {loading.value && <p class="text-gray-500 text-sm text-center py-8">Loading…</p>}
        {!loading.value && visible().length === 0 && (
          <p class="text-gray-500 text-sm text-center py-8">
            No purchase orders. Tap “Sync from QuickBooks”.
          </p>
        )}
        {visible().map((po) => (
          <button
            key={po.id}
            class="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-3 active:scale-[0.99] transition-transform"
            onClick$={() => nav(`/pos/orders/${po.id}`)}
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold text-white truncate">
                  {po.vendor_name || "Unknown vendor"}
                </div>
                <div class="text-xs text-gray-500">
                  PO #{po.doc_number || "—"}
                  {po.txn_date ? ` · ${new Date(po.txn_date).toLocaleDateString()}` : ""}
                </div>
              </div>
              <span class={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[po.receive_status]}`}>
                {po.receive_status}
              </span>
            </div>
            <div class="flex items-center gap-1.5 mt-2 flex-wrap">
              <span class="text-[11px] text-gray-400">
                {po.matched_lines}/{po.line_count} lines matched
              </span>
              {po.has_backorder && (
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-300">BACKORDER</span>
              )}
              {po.has_over && (
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-300">OVER</span>
              )}
              {po.has_unmatched && (
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-300">UNMATCHED</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
