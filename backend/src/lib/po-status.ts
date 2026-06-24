// Pure receiving-status logic, shared by every PO endpoint so "what state is this
// line/PO in" is computed in exactly one place.

export type LineLike = {
  qty_ordered: number | string
  qty_received: number | string
  closed?: boolean
  variant_id?: string | null
}

export type LineState = {
  ordered: number
  received: number
  remaining: number
  over: number
  backordered: number
  matched: boolean
  status: "pending" | "partial" | "received" | "over" | "closed"
}

// Per-line receiving state.
//  - pending:  nothing received yet
//  - partial:  some received, still owed (the remainder is backordered)
//  - received: received exactly what was ordered
//  - over:     received more than ordered (supplier overship)
//  - closed:   short-closed; the remainder is cancelled, not backordered
export function lineState(l: LineLike): LineState {
  const ordered = Number(l.qty_ordered) || 0
  const received = Number(l.qty_received) || 0
  const remaining = Math.max(0, ordered - received)
  const over = Math.max(0, received - ordered)

  let status: LineState["status"]
  if (l.closed) status = "closed"
  else if (received === 0) status = "pending"
  else if (received < ordered) status = "partial"
  else if (received === ordered) status = "received"
  else status = "over"

  // Backorder = what's still owed on a line that has been PARTIALLY received
  // (some arrived, the rest is outstanding). A line with nothing received yet is
  // just pending — not a backorder.
  const backordered = !l.closed && received > 0 && received < ordered ? remaining : 0

  return {
    ordered,
    received,
    remaining,
    over,
    backordered,
    matched: !!l.variant_id,
    status,
  }
}

export type PoState = {
  receive_status: "pending" | "partial" | "received" | "closed"
  has_backorder: boolean
  has_over: boolean
  has_unmatched: boolean
  lines: LineState[]
}

// Roll line states up to a PO. A PO reads as "received" when every line is either
// fully received, overshipped, or short-closed — i.e. nothing is still owed.
export function poState(lines: LineLike[], poClosed?: boolean): PoState {
  const base = lines.map(lineState)
  const settled = (s: LineState) =>
    s.status === "received" || s.status === "over" || s.status === "closed"

  let receive_status: PoState["receive_status"]
  if (poClosed) receive_status = "closed"
  else if (base.length && base.every(settled)) receive_status = "received"
  else if (base.some((s) => s.received > 0)) receive_status = "partial"
  else receive_status = "pending"

  // Backorder applies only once a PO has *started* being received (status
  // "partial"). At that point any open line with outstanding quantity is on
  // backorder — including a line that received nothing in the delivery so far.
  // A pending PO (nothing received yet) is not backordered, just awaiting goods.
  const isPartial = receive_status === "partial"
  const states = base.map((s) => ({
    ...s,
    backordered: isPartial && s.status !== "closed" && s.remaining > 0 ? s.remaining : 0,
  }))

  return {
    receive_status,
    has_backorder: states.some((s) => s.backordered > 0),
    has_over: states.some((s) => s.over > 0),
    has_unmatched: states.some((s) => !s.matched),
    lines: states,
  }
}
