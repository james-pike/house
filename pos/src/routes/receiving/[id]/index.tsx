import { component$, useSignal, useStore, $, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation, useNavigate } from "@builder.io/qwik-city";
import { CARD, BADGE, statusLabel } from "../../../lib/ui";

const API = "/api";

interface Line {
  id: string;
  item_name: string | null;
  sku: string | null;
  variant_id: string | null;
  closed: boolean;
  ordered: number;
  received: number;
  remaining: number;
  over: number;
  backordered: number;
  matched: boolean;
  status: "pending" | "partial" | "received" | "over" | "closed";
  unit_cost: number | string;
  receipts: { qty: number }[];
}
interface Po {
  id: string;
  doc_number: string | null;
  vendor_name: string | null;
  txn_date: string | null;
  closed: boolean;
  receive_status: string;
  qbo_bill_id: string | null;
  lines: Line[];
}

export default component$(() => {
  const loc = useLocation();
  const nav = useNavigate();
  const poId = loc.params.id;
  const token = useSignal("");
  const loading = useSignal(true);
  const busy = useSignal(false);
  const error = useSignal("");
  const toast = useSignal("");
  const store = useStore<{ po: Po | null }>({ po: null });
  const qtyById = useStore<Record<string, number>>({});
  const overById = useStore<Record<string, string>>({});

  const flash = $((m: string) => { toast.value = m; setTimeout(() => (toast.value = ""), 2800); });

  const load = $(async () => {
    error.value = "";
    try {
      const res = await fetch(`${API}/admin/pos/purchase-orders/${poId}`, { headers: { Authorization: `Bearer ${token.value}` }, credentials: "include", cache: "no-store" });
      if (res.status === 401) { error.value = "Session expired — sign in again."; loading.value = false; return; }
      if (!res.ok) { error.value = `Failed to load PO (${res.status})`; loading.value = false; return; }
      const data = await res.json();
      store.po = data.purchase_order;
      for (const l of store.po!.lines) {
        qtyById[l.id] = l.remaining > 0 ? l.remaining : 0;
        overById[l.id] = "";
      }
    } catch (e: any) { error.value = e.message; }
    loading.value = false;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    token.value = localStorage.getItem("pos_token") || "";
    await load();
  });

  const receive = $(async (line: Line, allowOver: boolean) => {
    const qty = Number(qtyById[line.id] || 0);
    if (qty <= 0) { flash("Enter a quantity"); return; }
    busy.value = true;
    try {
      const body: any = { po_line_id: line.id, quantity: qty };
      if (allowOver) body.allow_over = true;
      const res = await fetch(`${API}/admin/pos/purchase-orders/${poId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.value}` },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        flash(`Received ${qty} · ${line.item_name ?? "item"}`);
        overById[line.id] = "";
        await load();
      } else if (data.code === "over_receipt") {
        overById[line.id] = data.message;
      } else if (data.code === "unmatched_line") {
        flash("Enter the item barcode to link this line first.");
      } else {
        flash(data.message || `Receive failed (${res.status})`);
      }
    } catch (e: any) { flash(e.message); }
    busy.value = false;
  });

  const receiveAll = $(async () => {
    const po = store.po;
    if (!po) return;
    const targets = po.lines.filter((l) => !l.closed && l.matched && l.remaining > 0);
    if (!targets.length) { flash("Nothing left to receive"); return; }
    busy.value = true;
    for (const l of targets) {
      try {
        await fetch(`${API}/admin/pos/purchase-orders/${poId}/receive`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.value}` },
          credentials: "include",
          body: JSON.stringify({ po_line_id: l.id, quantity: l.remaining }),
        });
      } catch { /* continue */ }
    }
    busy.value = false;
    flash("Received all remaining");
    await load();
  });

  const closePo = $(async () => {
    if (!confirm("Close this PO? Unreceived quantities are cancelled and a Bill is sent to QuickBooks.")) return;
    busy.value = true;
    try {
      const res = await fetch(`${API}/admin/pos/purchase-orders/${poId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.value}` },
        credentials: "include",
        body: JSON.stringify({ close_lines: true }),
      });
      const d = await res.json();
      if (res.ok) {
        const billed = d.bill?.ok && d.bill?.bill_id && !d.bill?.skipped;
        flash(billed ? `PO closed · Bill ${d.bill.bill_id} sent to QuickBooks` : "PO closed");
        await load();
      } else flash(d.message || `Close failed (${res.status})`);
    } catch (e: any) { flash(e.message); }
    busy.value = false;
  });

  const po = () => store.po;
  const totals = () => {
    const ls = po()?.lines ?? [];
    return {
      ordered: ls.reduce((a, l) => a + l.ordered, 0),
      received: ls.reduce((a, l) => a + l.received, 0),
      backordered: ls.reduce((a, l) => a + l.backordered, 0),
      over: ls.reduce((a, l) => a + l.over, 0),
    };
  };
  const setQty = $((id: string, v: number) => { qtyById[id] = Math.max(0, v); });

  return (
    <div class="max-w-6xl mx-auto px-6 py-6">
      <button class="recv-muted text-sm hover:recv-strong mb-4 inline-flex items-center gap-1.5 transition-colors" onClick$={() => nav("/receiving")}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        All purchase orders
      </button>

      {loading.value && <p class="recv-muted">Loading…</p>}
      {error.value && <div class="recv-card recv-rose text-sm p-3">{error.value}</div>}

      {po() && (
        <>
          {/* Header card */}
          <div class={`${CARD} p-5 mb-4`}>
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3.5 min-w-0">
                <div class="recv-chip recv-accent w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold shrink-0">
                  {(po()!.vendor_name || "?").charAt(0).toUpperCase()}
                </div>
                <div class="min-w-0">
                  <div class="text-xl font-semibold truncate">{po()!.vendor_name || "Purchase Order"}</div>
                  <div class="recv-muted text-sm mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>PO #{po()!.doc_number || "—"}</span>
                    {po()!.txn_date && <span>· {new Date(po()!.txn_date!).toLocaleDateString()}</span>}
                    <span class={BADGE[po()!.closed ? "closed" : (po()!.receive_status as string)] || BADGE.pending}>{statusLabel(po()!.receive_status)}</span>
                    {po()!.qbo_bill_id && <span class={BADGE.received}>Billed #{po()!.qbo_bill_id}</span>}
                  </div>
                </div>
              </div>
              {!po()!.closed && (
                <div class="flex gap-2 shrink-0">
                  {po()!.receive_status !== "received" && (
                    <button class="recv-btn recv-btn--success text-sm px-3.5 py-2" onClick$={receiveAll} disabled={busy.value}>Receive all</button>
                  )}
                  <button class={`text-sm px-3.5 py-2 recv-btn ${po()!.receive_status === "received" ? "recv-btn--success" : "recv-btn--primary"}`} onClick$={closePo} disabled={busy.value}>Close PO</button>
                </div>
              )}
            </div>

            {/* Summary + overall progress */}
            <div class="grid grid-cols-3 gap-3 mt-5">
              <Mini label="Ordered" value={totals().ordered} />
              <Mini label="Received" value={totals().received} tone="emerald" />
              <Mini label="Backordered" value={totals().backordered} tone="amber" />
            </div>
            <div class="recv-track h-2 mt-4">
              <div class="recv-bar" style={{ width: `${totals().ordered ? Math.min(100, Math.round((totals().received / totals().ordered) * 100)) : 0}%` }} />
            </div>
          </div>

          {/* Lines table */}
          <div class={`${CARD} overflow-hidden`}>
            <table class="recv-table text-sm">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="num">Ordered</th>
                  <th class="num">Received</th>
                  <th class="num">Remaining</th>
                  <th>Status</th>
                  <th class="num w-72">Receive</th>
                </tr>
              </thead>
              <tbody>
                {po()!.lines.map((line) => {
                  const pct = line.ordered ? Math.min(100, Math.round((line.received / line.ordered) * 100)) : 0;
                  return (
                    <>
                      <tr key={line.id} class={line.closed ? "recv-row-dim" : line.remaining === 0 && line.received > 0 ? "recv-row-done" : line.status === "partial" ? "recv-row-back" : ""}>
                        <td>
                          <div class="font-medium">{line.item_name || "Item"}</div>
                          <div class="flex items-center gap-2 mt-1">
                            <span class="recv-muted text-xs">SKU {line.sku || "—"}</span>
                          </div>
                          <div class="recv-track h-1 w-40 mt-1.5">
                            <div class={`recv-bar ${line.over ? "recv-bar--over" : pct >= 100 ? "recv-bar--done" : ""}`} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td class="text-right recv-strong tabular-nums">{line.ordered}</td>
                        <td class="text-right recv-strong tabular-nums">{line.received}</td>
                        <td class="text-right tabular-nums">
                          <span class={line.backordered > 0 ? "recv-amber" : line.over > 0 ? "recv-orange" : "recv-muted"}>
                            {line.remaining}{line.over > 0 ? ` (+${line.over})` : ""}
                          </span>
                        </td>
                        <td><span class={BADGE[line.closed ? "closed" : line.status]}>{line.closed ? "closed" : statusLabel(line.status)}</span></td>
                        <td>
                          {line.closed ? (
                            <span class="recv-muted block text-right text-xs">—</span>
                          ) : line.remaining === 0 && line.received > 0 ? (
                            <div class="flex justify-end">
                              <span class="recv-check">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              </span>
                            </div>
                          ) : (
                            <div class="flex flex-col items-end gap-1.5">
                              <div class="flex items-center gap-2">
                                <div class="recv-stepper">
                                  <button onClick$={() => setQty(line.id, (qtyById[line.id] || 0) - 1)}>−</button>
                                  <input type="number" value={qtyById[line.id] ?? 0} onInput$={(e) => (qtyById[line.id] = parseInt((e.target as HTMLInputElement).value) || 0)} />
                                  <button onClick$={() => setQty(line.id, (qtyById[line.id] || 0) + 1)}>+</button>
                                </div>
                                <button class="recv-btn recv-btn--success text-sm px-4 py-2" onClick$={() => receive(line, false)} disabled={busy.value}>Receive</button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                      {overById[line.id] && (
                        <tr key={line.id + "-over"}>
                          <td colSpan={6} class="py-2.5">
                            <div class="flex items-center justify-end gap-3">
                              <span class="recv-orange text-xs">{overById[line.id]}</span>
                              <button class="recv-btn recv-btn--secondary text-xs px-3 py-1.5" onClick$={() => receive(line, true)} disabled={busy.value}>Over-receive anyway</button>
                              <button class="recv-btn recv-btn--ghost text-xs px-2 py-1.5" onClick$={() => (overById[line.id] = "")}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {po()!.lines.length === 0 && (
                  <tr><td colSpan={6} class="recv-muted text-center py-10">This PO has no item lines.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {toast.value && <div class="recv-toast">{toast.value}</div>}
    </div>
  );
});

const Mini = component$<{ label: string; value: number; tone?: "emerald" | "amber" | "orange" }>(({ label, value, tone }) => {
  const color = tone === "emerald" ? "recv-emerald" : tone === "amber" ? "recv-amber" : tone === "orange" ? "recv-orange" : "recv-strong";
  return (
    <div class="recv-inset px-4 py-3">
      <div class={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
      <div class="recv-muted text-xs mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  );
});
