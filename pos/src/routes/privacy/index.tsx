import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div class="min-h-screen bg-white text-gray-800">
      <div class="max-w-2xl mx-auto px-6 py-12">
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
        <p class="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

        <div class="space-y-5 text-[15px] leading-relaxed">
          <p>
            This application is an internal inventory and receiving tool used by The Safety
            House (the "Company") to manage purchase orders and stock for its retail
            operation. It is not a public product and is not offered to third parties.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">Information we access</h2>
          <p>
            With the Company's authorization, the application connects to QuickBooks Online
            through Intuit's API to read purchase orders, vendors, items, and related
            accounting records, and to write back vendor bills and purchase-order status as
            part of the receiving workflow. We access only the data needed to keep the
            Company's inventory and accounting in sync.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">How we use it</h2>
          <p>
            QuickBooks data is used solely for the Company's internal inventory receiving and
            reconciliation. We do not sell it, share it with third parties, or use it for
            advertising or any purpose unrelated to operating the Company's inventory system.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">Storage and security</h2>
          <p>
            Authentication tokens used to connect to QuickBooks are stored securely and are
            used only to maintain the connection. Access to the application is limited to
            authorized Company employees. Data is retained only as long as needed for
            inventory operations and is removed when the QuickBooks connection is revoked.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">Disconnecting</h2>
          <p>
            The Company can revoke the application's access at any time from within
            QuickBooks Online under Apps &rarr; Connected Apps, which stops all further data
            access.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">Contact</h2>
          <p>
            Questions about this policy can be directed to the Company at{" "}
            <a href="mailto:admin@safetyhouse.ca" class="text-amber-600 underline">
              admin@safetyhouse.ca
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Privacy Policy — The Safety House",
};
