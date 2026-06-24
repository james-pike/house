import { component$, useSignal, useStore, $, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { CARD, FIELD, BTN_PRIMARY, BADGE, FLAG, statusLabel } from "../../lib/ui";

const API = "/api";

interface PoSummary {
  id: string;
  doc_number: string | null;
  vendor_name: string | null;
  txn_date: string | null;
  closed: boolean;
  line_count: number;
  matched_lines: number;
  unmatched_lines: number;
  ordered_units: number;
  received_units: number;
  receive_status: "pending" | "partial" | "received" | "closed";
  has_backorder: boolean;
  has_over: boolean;
  has_unmatched: boolean;
  billed: boolean;
}

const FILTERS = ["open", "pending", "partial", "received", "closed"] as const;

export default component$(() => {
  const nav = useNavigate();
  const token = useSignal("");
  const loading = useSignal(true);
  const syncing = useSignal(false);
  const error = useSignal("");
  const filter = useSignal<(typeof FILTERS)[number]>("open");
  const state = useStore<{ orders: PoSummary[] }>({ orders: [] });
  const qb = useStore<{ connected: boolean; env: string }>({ connected: false, env: "" });
  const poNumber = useSignal("");
  const jumpMsg = useSignal("");
  const jumping = useSignal(false);

  const load = $(async () => {
    loading.value = true;
    error.value = "";
    try {
      const res = await fetch(`${API}/admin/pos/purchase-orders`, { headers: { Authorization: `Bearer ${token.value}` }, credentials: "include", cache: "no-store" });
      if (res.status === 401) { error.value = "Session expired — sign in again."; loading.value = false; return; }
      const data = await res.json();
      state.orders = data.purchase_orders ?? [];
    } catch (e: any) { error.value = e.message; }
    loading.value = false;
  });

  const loadStatus = $(async () => {
    try {
      const res = await fetch(`${API}/admin/pos/quickbooks/status`, { headers: { Authorization: `Bearer ${token.value}` }, credentials: "include" });
      if (res.ok) { const d = await res.json(); qb.connected = !!d.connected; qb.env = d.environment || ""; }
    } catch { /* best-effort */ }
  });

  const sync = $(async () => {
    syncing.value = true; error.value = "";
    try {
      const res = await fetch(`${API}/admin/pos/quickbooks/sync-pos`, { method: "POST", headers: { Authorization: `Bearer ${token.value}` }, credentials: "include" });
      const d = await res.json();
      if (!res.ok || d.ok === false) error.value = d.message || "Sync failed — is QuickBooks connected?";
    } catch (e: any) { error.value = e.message; }
    syncing.value = false;
    await load();
  });

  const connect = $(() => window.open(`${API}/quickbooks/connect`, "_blank"));

  const openByNumber = $(async () => {
    const q = poNumber.value.trim();
    if (!q) return;
    jumping.value = true; jumpMsg.value = "";
    const norm = (s: string | null) => (s || "").toLowerCase().replace(/^#/, "");
    const key = q.toLowerCase().replace(/^#/, "");
    const pick = () => {
      const m = state.orders.filter((o) => norm(o.doc_number) === key);
      return m.find((o) => !o.closed && o.receive_status !== "received") || m[0];
    };
    let match = pick();
    if (!match) { await sync(); match = pick(); }
    jumping.value = false;
    if (match) { poNumber.value = ""; nav(`/receiving/${match.id}`); }
    else jumpMsg.value = `No purchase order “${q}” found. Try Sync, or check the number.`;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    token.value = localStorage.getItem("pos_token") || "";
    await load();
    await loadStatus();
  });

  const visible = () =>
    state.orders.filter((o) => {
      if (filter.value === "open") return !o.closed && o.receive_status !== "received";
      return o.receive_status === filter.value;
    });

  const openCount = () => state.orders.filter((o) => !o.closed && o.receive_status !== "received").length;
  const backorderCount = () => state.orders.filter((o) => o.has_backorder).length;

  return (
    <div class="max-w-6xl mx-auto px-6 py-8">
      {/* Title + QuickBooks controls */}
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Receiving</h1>
          <p class="recv-muted text-sm mt-0.5">Receive purchase orders against QuickBooks.</p>
        </div>
        <div class="flex items-center gap-2.5">
          {!qb.connected && (
            <button class="recv-btn recv-btn--success text-sm px-3 py-2" onClick$={connect}>Connect</button>
          )}
          <button class="recv-btn recv-btn--success text-sm px-3.5 py-2 gap-2" onClick$={sync} disabled={syncing.value}>
            <span class={`recv-dot ${qb.connected ? "recv-dot--on" : "recv-dot--off"}`} />
            {syncing.value ? "Syncing…" : "Sync with Quickbooks"}
          </button>
        </div>
      </div>

      {/* Hero: PO-number-first */}
      <div class={`${CARD} p-6 mb-6`}>
        <h2 class="text-lg font-semibold mb-4">Receive a purchase order</h2>
        <div class="flex gap-3 max-w-xl">
          <div class="relative flex-1">
            <svg class="recv-faint absolute left-3.5 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              autoFocus
              placeholder="e.g. 1006"
              class={`w-full pl-11 pr-4 py-3.5 text-lg font-medium ${FIELD}`}
              value={poNumber.value}
              onInput$={(e) => (poNumber.value = (e.target as HTMLInputElement).value)}
              onKeyDown$={async (e) => { if (e.key === "Enter") await openByNumber(); }}
            />
          </div>
          <button class={`px-7 text-base ${BTN_PRIMARY}`} onClick$={openByNumber} disabled={jumping.value}>
            {jumping.value ? "Finding…" : "Start"}
          </button>
        </div>
        {jumpMsg.value && <p class="recv-rose text-sm mt-3">{jumpMsg.value}</p>}
      </div>

      {/* Stat cards */}
      <div class="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Open POs" value={openCount()} tone="default" />
        <Stat label="With backorders" value={backorderCount()} tone="amber" />
        <Stat label="Total POs" value={state.orders.length} tone="default" />
      </div>

      {/* PO table */}
      <div class="flex items-center justify-between mb-3">
        <h3 class="recv-muted text-xs font-semibold uppercase tracking-wider">Purchase orders</h3>
        <div class="flex gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} class={`recv-seg ${filter.value === f ? "recv-seg--active" : ""}`} onClick$={() => (filter.value = f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {error.value && <div class="recv-card recv-rose text-sm p-3 mb-3">{error.value}</div>}

      <div class={`${CARD} overflow-hidden`}>
        <table class="recv-table text-sm">
          <thead>
            <tr>
              <th>PO</th>
              <th>Vendor</th>
              <th>Date</th>
              <th class="w-48">Progress</th>
              <th>Status</th>
              <th class="num">Flags</th>
            </tr>
          </thead>
          <tbody>
            {loading.value && (
              <tr><td colSpan={6} class="recv-muted text-center py-10">Loading…</td></tr>
            )}
            {!loading.value && visible().length === 0 && (
              <tr><td colSpan={6} class="recv-muted text-center py-10">No purchase orders here. Click <span class="recv-strong font-medium">Sync POs</span>.</td></tr>
            )}
            {visible().map((po) => {
              const pct = po.ordered_units ? Math.min(100, Math.round((po.received_units / po.ordered_units) * 100)) : 0;
              return (
                <tr key={po.id} class="hoverable" onClick$={() => nav(`/receiving/${po.id}`)}>
                  <td class="font-semibold whitespace-nowrap">#{po.doc_number || "—"}</td>
                  <td class="recv-strong">{po.vendor_name || "Unknown vendor"}</td>
                  <td class="recv-muted whitespace-nowrap">{po.txn_date ? new Date(po.txn_date).toLocaleDateString() : "—"}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="recv-track flex-1 h-1.5">
                        <div class={`recv-bar ${pct >= 100 ? "recv-bar--done" : ""}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span class="recv-muted text-xs tabular-nums w-14 text-right">{po.received_units}/{po.ordered_units}</span>
                    </div>
                  </td>
                  <td><span class={BADGE[po.receive_status]}>{statusLabel(po.receive_status)}</span></td>
                  <td>
                    <div class="flex gap-1.5 justify-end">
                      {po.has_over && <span class={FLAG.over}>OVER</span>}
                      {po.billed && <span class={FLAG.billed}>BILLED</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const Stat = component$<{ label: string; value: number; tone: "default" | "amber" | "rose" }>(({ label, value, tone }) => {
  const valColor = tone === "amber" ? "recv-amber" : tone === "rose" ? "recv-rose" : "recv-strong";
  return (
    <div class="recv-inset px-5 py-4">
      <div class={`text-2xl font-semibold tabular-nums ${valColor}`}>{value}</div>
      <div class="recv-muted text-xs mt-0.5">{label}</div>
    </div>
  );
});
