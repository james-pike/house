import { component$, type QRL } from "@builder.io/qwik";

interface Props {
  sale: any;
  onClose$: QRL<() => void>;
}

export default component$<Props>(({ sale, onClose$ }) => {
  return (
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div class="bg-white text-black w-80 rounded-lg shadow-xl">
        {/* Receipt content - print-ready */}
        <div id="receipt-content" class="p-6 font-mono text-sm">
          <div class="text-center mb-4">
            <h2 class="text-lg font-bold">M1 STORE</h2>
            <p class="text-xs text-gray-500">Receipt</p>
            <p class="text-xs text-gray-500">
              {new Date(sale.date).toLocaleString()}
            </p>
          </div>

          <div class="border-t border-dashed border-gray-300 my-2" />

          <div class="space-y-1">
            {sale.items?.map((item: any, i: number) => (
              <div key={i} class="flex justify-between">
                <span class="truncate flex-1 pr-2">
                  {item.quantity}x {item.title}
                </span>
                <span>
                  {((item.unit_price * item.quantity) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div class="border-t border-dashed border-gray-300 my-2" />

          <div class="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{(sale.total / 100).toFixed(2)} EUR</span>
          </div>

          <div class="mt-2 text-xs space-y-0.5">
            <div class="flex justify-between">
              <span>Payment</span>
              <span class="uppercase">{sale.payment_method}</span>
            </div>
            {sale.payment_method === "cash" && (
              <>
                <div class="flex justify-between">
                  <span>Tendered</span>
                  <span>{(sale.amount_tendered / 100).toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Change</span>
                  <span>{((sale.change || 0) / 100).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div class="border-t border-dashed border-gray-300 my-2" />

          <p class="text-center text-xs text-gray-500">Thank you!</p>
          {sale.order_id && (
            <p class="text-center text-xs text-gray-400 mt-1">
              Order: {sale.order_id}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div class="border-t p-4 flex gap-2">
          <button
            class="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm"
            onClick$={() => window.print()}
          >
            Print Receipt
          </button>
          <button
            class="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 text-sm"
            onClick$={onClose$}
          >
            Close
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #receipt-content, #receipt-content * { visibility: visible; }
            #receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              padding: 5mm;
            }
          }
        `}
      </style>
    </div>
  );
});
