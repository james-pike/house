import { component$, type QRL } from "@builder.io/qwik";

interface Props {
  total: number;
  amountTendered: number;
  onChange$: QRL<(val: number) => void>;
}

export default component$<Props>(({ total, amountTendered, onChange$ }) => {
  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  return (
    <div>
      <label class="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">Amount Tendered</label>
      <input
        type="number"
        class="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-lg border border-gray-700 focus:border-emerald-500 focus:outline-none tabular-nums"
        placeholder="0.00"
        value={amountTendered ? (amountTendered / 100).toFixed(2) : ""}
        onInput$={(e) => {
          const val = parseFloat((e.target as HTMLInputElement).value) || 0;
          onChange$(Math.max(0, Math.round(val * 100)));
        }}
      />
      <div class="flex gap-1 mt-1.5">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            class={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              amountTendered === amount
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick$={() => onChange$(amount)}
          >
            ${amount / 100}
          </button>
        ))}
        <button
          class="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          onClick$={() => onChange$(total)}
        >
          Exact
        </button>
      </div>
    </div>
  );
});
