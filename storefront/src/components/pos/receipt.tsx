import { component$, type QRL } from "@builder.io/qwik";

interface Props {
  sale: any;
  onClose$: QRL<() => void>;
}

export default component$<Props>(({ sale, onClose$ }) => {
  const currency = (sale.currency_code || "cad").toUpperCase();

  return (
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-white text-black w-80 rounded-xl shadow-2xl overflow-hidden">
        {/* Receipt content - print-ready */}
        <div id="receipt-content" class="p-5 font-mono text-sm">
          <div class="text-center mb-3">
            <img src="/logo.png" alt="The Safety House" class="h-10 mx-auto mb-2" />
            <p class="text-[10px] text-gray-400 uppercase tracking-widest">Receipt</p>
            <p class="text-[10px] text-gray-400">
              {new Date(sale.date).toLocaleString()}
            </p>
          </div>

          <div class="border-t border-dashed border-gray-300 my-2" />

          <div class="space-y-0.5">
            {sale.items?.map((item: any, i: number) => (
              <div key={i} class="flex justify-between text-xs">
                <span class="truncate flex-1 pr-2">
                  {item.quantity}x {item.title}
                </span>
                <span class="font-medium">
                  {((item.unit_price * item.quantity) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div class="border-t border-dashed border-gray-300 my-2" />

          <div class="flex justify-between font-bold text-base">
            <span>TOTAL</span>
            <span>${(sale.total / 100).toFixed(2)} {currency}</span>
          </div>

          <div class="mt-2 text-xs space-y-0.5 text-gray-600">
            <div class="flex justify-between">
              <span>Payment</span>
              <span class="uppercase font-medium">{sale.payment_method}</span>
            </div>
            {sale.payment_method === "cash" && (
              <>
                <div class="flex justify-between">
                  <span>Tendered</span>
                  <span>${(sale.amount_tendered / 100).toFixed(2)}</span>
                </div>
                <div class="flex justify-between font-medium text-green-700">
                  <span>Change</span>
                  <span>${((sale.change || 0) / 100).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div class="border-t border-dashed border-gray-300 my-2" />

          <p class="text-center text-[10px] text-gray-400">Thank you for your purchase!</p>
          {sale.order_id && (
            <p class="text-center text-[10px] text-gray-300 mt-0.5">
              Ref: {sale.order_id}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div class="border-t p-3 flex gap-2 bg-gray-50">
          <button
            class="flex-1 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium"
            onClick$={() => window.print()}
          >
            Print
          </button>
          <button
            class="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 text-sm font-medium"
            onClick$={onClose$}
          >
            Done
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
