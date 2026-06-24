// Class-name handles for the Receiving design system. The actual styling lives
// in global.css (.recv-* rules) so it's plain CSS — never subject to Tailwind
// content detection, so it can't wash out. Layout/spacing still use Tailwind
// utilities in the components; these cover surfaces, controls and theming.

// Display label for a receive status: a partially-received PO/line reads as
// "backorder" (the outstanding remainder is on backorder).
export const statusLabel = (s: string): string => (s === "partial" ? "backorder" : s);

export const CARD = "recv-card";
export const FIELD = "recv-field";
export const BTN_PRIMARY = "recv-btn recv-btn--primary";
export const BTN_SECONDARY = "recv-btn recv-btn--secondary";

export const BADGE: Record<string, string> = {
  pending: "recv-badge recv-badge--pending",
  partial: "recv-badge recv-badge--partial",
  received: "recv-badge recv-badge--received",
  over: "recv-badge recv-badge--over",
  closed: "recv-badge recv-badge--closed",
};

export const FLAG: Record<string, string> = {
  backorder: "recv-flag recv-flag--backorder",
  over: "recv-flag recv-flag--over",
  unmatched: "recv-flag recv-flag--unmatched",
  billed: "recv-flag recv-flag--billed",
};
