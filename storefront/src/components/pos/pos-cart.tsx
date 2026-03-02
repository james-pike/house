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
      <div class="text-center py-8 text-gray-500">
        <p class="text-sm">No items in cart</p>
        <p class="text-xs mt-1">Scan a barcode or search for products</p>
      </div>
    );
  }

  return (
    <div class="space-y-2">
      <h3 class="text-sm font-medium text-gray-400 uppercase tracking-wide">
        Cart ({items.length} items)
      </h3>
      {items.map((item, index) => (
        <div
          key={item.variant_id}
          class="bg-gray-700 rounded-lg p-3 flex items-center gap-3"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{item.title}</p>
            <p class="text-xs text-gray-400">{item.sku}</p>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="w-6 h-6 rounded bg-gray-600 hover:bg-gray-500 text-xs flex items-center justify-center"
              onClick$={() => onUpdateQty$(index, item.quantity - 1)}
            >
              -
            </button>
            <span class="w-8 text-center text-sm">{item.quantity}</span>
            <button
              class="w-6 h-6 rounded bg-gray-600 hover:bg-gray-500 text-xs flex items-center justify-center"
              onClick$={() => onUpdateQty$(index, item.quantity + 1)}
            >
              +
            </button>
          </div>
          <p class="text-sm font-semibold w-20 text-right">
            {((item.unit_price * item.quantity) / 100).toFixed(2)}
          </p>
          <button
            class="text-red-400 hover:text-red-300 text-xs"
            onClick$={() => onRemove$(index)}
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
});
