import {
  component$,
  createContextId,
  useContextProvider,
  useStore,
  useVisibleTask$,
  $,
  Slot,
  type QRL,
} from "@builder.io/qwik";

export interface CartItem {
  id: string;
  title: string;
  variant_title: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  currency_code: string;
  thumbnail?: string;
  product_handle?: string;
}

export interface CartState {
  id: string;
  items: CartItem[];
  total: number;
  item_count: number;
  loading: boolean;
  open: boolean;
  region_id: string;
}

export const CartContext = createContextId<CartState>("cart");

export const CartActionsContext = createContextId<{
  addToCart: QRL<(variantId: string, quantity: number) => Promise<void>>;
  updateQuantity: QRL<(lineItemId: string, quantity: number) => Promise<void>>;
  removeItem: QRL<(lineItemId: string) => Promise<void>>;
  toggleCart: QRL<() => void>;
}>("cart-actions");

function mapCart(cart: any): Partial<CartState> {
  return {
    id: cart.id,
    items: (cart.items || []).map((item: any) => ({
      id: item.id,
      title: item.product_title || item.title || "",
      variant_title: item.variant_title || "",
      variant_id: item.variant_id,
      quantity: item.quantity,
      unit_price: item.unit_price || item.total / item.quantity,
      currency_code: cart.currency_code || "cad",
      thumbnail: item.thumbnail,
      product_handle: item.product_handle,
    })),
    total: cart.total || 0,
    item_count: (cart.items || []).reduce((s: number, i: any) => s + i.quantity, 0),
  };
}

export const CartProvider = component$(() => {
  const state = useStore<CartState>({
    id: "",
    items: [],
    total: 0,
    item_count: 0,
    loading: false,
    open: false,
    region_id: "reg_01KJV8N6A5Y58TTVRAP5R75SC7",
  });

  useContextProvider(CartContext, state);

  const backendUrl =
    typeof process !== "undefined"
      ? process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
      : "http://localhost:9000";

  const publishableKey =
    typeof process !== "undefined"
      ? process.env.MEDUSA_PUBLISHABLE_KEY || ""
      : "";

  const medusaHeaders = $(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (publishableKey) h["x-publishable-api-key"] = publishableKey;
    return h;
  });

  const fetchCart = $(async (cartId: string) => {
    const headers = await medusaHeaders();
    const res = await fetch(`${backendUrl}/store/carts/${cartId}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.cart;
  });

  const createCart = $(async () => {
    const headers = await medusaHeaders();
    const res = await fetch(`${backendUrl}/store/carts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ region_id: state.region_id }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.cart;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const savedId = localStorage.getItem("cart_id");
    if (savedId) {
      const cart = await fetchCart(savedId);
      if (cart && cart.completed_at === null) {
        const mapped = mapCart(cart);
        Object.assign(state, mapped);
        return;
      }
    }
    // Create new cart
    const cart = await createCart();
    if (cart) {
      localStorage.setItem("cart_id", cart.id);
      const mapped = mapCart(cart);
      Object.assign(state, mapped);
    }
  });

  const addToCart = $(async (variantId: string, quantity: number) => {
    state.loading = true;
    try {
      if (!state.id) {
        const cart = await createCart();
        if (!cart) throw new Error("Failed to create cart");
        localStorage.setItem("cart_id", cart.id);
        state.id = cart.id;
      }
      const headers = await medusaHeaders();
      const res = await fetch(`${backendUrl}/store/carts/${state.id}/line-items`, {
        method: "POST",
        headers,
        body: JSON.stringify({ variant_id: variantId, quantity }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data = await res.json();
      const mapped = mapCart(data.cart);
      Object.assign(state, mapped);
      state.open = true;
    } catch (e) {
      console.error("Add to cart failed:", e);
    }
    state.loading = false;
  });

  const updateQuantity = $(async (lineItemId: string, quantity: number) => {
    state.loading = true;
    try {
      const headers = await medusaHeaders();
      const res = await fetch(`${backendUrl}/store/carts/${state.id}/line-items/${lineItemId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      const mapped = mapCart(data.cart);
      Object.assign(state, mapped);
    } catch (e) {
      console.error("Update quantity failed:", e);
    }
    state.loading = false;
  });

  const removeItem = $(async (lineItemId: string) => {
    state.loading = true;
    try {
      const headers = await medusaHeaders();
      const res = await fetch(`${backendUrl}/store/carts/${state.id}/line-items/${lineItemId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Remove failed");
      const data = await res.json();
      const cart = data.parent || data.cart;
      const mapped = mapCart(cart);
      Object.assign(state, mapped);
    } catch (e) {
      console.error("Remove item failed:", e);
    }
    state.loading = false;
  });

  const toggleCart = $(() => {
    state.open = !state.open;
  });

  useContextProvider(CartActionsContext, {
    addToCart,
    updateQuantity,
    removeItem,
    toggleCart,
  });

  return <Slot />;
});
