const BACKEND_URL =
  typeof process !== "undefined"
    ? process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
    : "http://localhost:9000";

let adminToken = "";

export function setAdminToken(token: string) {
  adminToken = token;
}

export async function posAdminFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POS API error ${res.status}: ${body}`);
  }

  return res.json();
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  adminToken = data.token;
  return data.token;
}

export async function openSession(opening_cash: number) {
  return posAdminFetch<{ session: any }>("/admin/pos/sessions", {
    method: "POST",
    body: JSON.stringify({ opening_cash }),
  });
}

export async function closeSession(
  sessionId: string,
  closing_cash: number,
  notes?: string
) {
  return posAdminFetch<{ session: any }>(
    `/admin/pos/sessions/${sessionId}/close`,
    {
      method: "POST",
      body: JSON.stringify({ closing_cash, notes }),
    }
  );
}

export async function getSession(sessionId: string) {
  return posAdminFetch<{ session: any }>(`/admin/pos/sessions/${sessionId}`);
}

export async function lookupBarcode(code: string) {
  return posAdminFetch<{ variant: any }>(
    `/admin/pos/products/barcode/${encodeURIComponent(code)}`
  );
}

export async function processSale(data: {
  session_id: string;
  items: Array<{
    variant_id: string;
    quantity: number;
    unit_price: number;
    title: string;
  }>;
  payment_method: "cash" | "card";
  amount_tendered?: number;
  currency_code: string;
  region_id: string;
  sales_channel_id: string;
  location_id: string;
}) {
  return posAdminFetch<{ sale: any }>("/admin/pos/sale", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getInventory(location_id: string) {
  return posAdminFetch<{ inventory_levels: any[] }>(
    `/admin/pos/inventory?location_id=${location_id}`
  );
}
