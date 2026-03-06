import { component$, type QRL } from "@builder.io/qwik";

interface PosItem {
  variant_id: string;
  title: string;
  sku: string;
  unit_price: number;
  quantity: number;
}

interface Props {
  items: PosItem[];
  onRemove$: QRL<(index: number) => void>;
  onUpdateQty$: QRL<(index: number, qty: number) => void>;
}

export default component$<Props>(({ items, onRemove$, onUpdateQty$ }) => {
  if (items.length === 0) {
    return (
      <div class="text-center py-10">
        <div class="text-gray-700 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
        <p class="text-xs text-gray-600">Cart empty</p>
        <p class="text-[10px] text-gray-700 mt-0.5">Scan or search to add items</p>
      </div>
    );
  }

  return (
    <div class="space-y-1.5">
      <h3 class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
        Cart ({items.length})
      </h3>
      {items.map((item, index) => (
        <div
          key={item.variant_id}
          class="bg-gray-800/50 rounded-lg p-2.5 flex items-center gap-2"
        >
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium truncate">{item.title}</p>
            <p class="text-[10px] text-gray-500">{item.sku || "No SKU"}</p>
          </div>
          <div class="flex items-center gap-0.5">
            <button
              class="w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 text-xs flex items-center justify-center transition-colors"
              onClick$={() => onUpdateQty$(index, item.quantity - 1)}
            >
              -
            </button>
            <span class="w-7 text-center text-xs font-medium">{item.quantity}</span>
            <button
              class="w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 text-xs flex items-center justify-center transition-colors"
              onClick$={() => onUpdateQty$(index, item.quantity + 1)}
            >
              +
            </button>
          </div>
          <p class="text-xs font-semibold w-16 text-right tabular-nums">
            ${((item.unit_price * item.quantity) / 100).toFixed(2)}
          </p>
          <button
            class="text-gray-600 hover:text-red-400 transition-colors"
            onClick$={() => onRemove$(index)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
});
