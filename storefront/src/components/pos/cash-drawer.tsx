import { component$, type QRL } from "@builder.io/qwik";

interface Props {
  total: number;
  amountTendered: number;
  onChange$: QRL<(val: number) => void>;
}

export default component$<Props>(({ total, amountTendered, onChange$ }) => {
  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <div>
      <label class="block text-xs text-gray-400 mb-1">Amount Tendered</label>
      <input
        type="number"
        class="w-full bg-gray-700 text-white px-3 py-2 rounded text-lg"
        placeholder="0.00"
        value={amountTendered ? (amountTendered / 100).toFixed(2) : ""}
        onInput$={(e) => {
          const val = parseFloat((e.target as HTMLInputElement).value) || 0;
          onChange$(Math.round(val * 100));
        }}
      />
      <div class="flex gap-1 mt-2">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded text-xs"
            onClick$={() => onChange$(amount)}
          >
            {(amount / 100).toFixed(0)}
          </button>
        ))}
        <button
          class="flex-1 bg-green-700 hover:bg-green-600 text-white py-1.5 rounded text-xs"
          onClick$={() => onChange$(total)}
        >
          Exact
        </button>
      </div>
    </div>
  );
});
