const BACKEND_URL =
  typeof process !== "undefined"
    ? process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
    : "http://localhost:9000";

const PUBLISHABLE_KEY =
  typeof process !== "undefined"
    ? process.env.MEDUSA_PUBLISHABLE_KEY || ""
    : "";

export async function medusaFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY;
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(`Medusa API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getProducts() {
  const data = await medusaFetch<{ products: any[] }>("/store/products");
  return data.products;
}

export async function getProduct(handle: string) {
  const data = await medusaFetch<{ products: any[] }>(
    `/store/products?handle=${handle}`
  );
  return data.products[0] || null;
}

export async function createCart() {
  const data = await medusaFetch<{ cart: any }>("/store/carts", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return data.cart;
}

export async function getCart(cartId: string) {
  const data = await medusaFetch<{ cart: any }>(`/store/carts/${cartId}`);
  return data.cart;
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity: number
) {
  const data = await medusaFetch<{ cart: any }>(
    `/store/carts/${cartId}/line-items`,
    {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity }),
    }
  );
  return data.cart;
}

export async function updateLineItem(
  cartId: string,
  lineItemId: string,
  quantity: number
) {
  const data = await medusaFetch<{ cart: any }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    {
      method: "POST",
      body: JSON.stringify({ quantity }),
    }
  );
  return data.cart;
}

export async function removeLineItem(cartId: string, lineItemId: string) {
  const data = await medusaFetch<{ parent: any }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    { method: "DELETE" }
  );
  return data.parent;
}
