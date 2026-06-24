import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div class="min-h-screen bg-white text-gray-800">
      <div class="max-w-2xl mx-auto px-6 py-12">
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Terms of Use</h1>
        <p class="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

        <div class="space-y-5 text-[15px] leading-relaxed">
          <p>
            This application is an internal inventory and receiving tool operated by The
            Safety House (the "Company") for its own retail operation. It is provided for use
            by authorized Company employees only and is not offered or licensed to the public.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">Authorized use</h2>
          <p>
            Access is limited to employees the Company authorizes. Users agree to use the
            application only for legitimate inventory and receiving tasks and to keep their
            login credentials confidential.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">QuickBooks connection</h2>
          <p>
            The application integrates with QuickBooks Online via Intuit's API. Use of that
            connection and any QuickBooks data is also subject to Intuit's applicable terms.
            The Company is responsible for authorizing and revoking the connection.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">No warranty</h2>
          <p>
            The application is provided "as is," without warranties of any kind. The Company
            does not guarantee that it will be uninterrupted or error-free, and is not liable
            for any indirect or consequential loss arising from its use.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">Changes</h2>
          <p>
            These terms may be updated from time to time. Continued use of the application
            constitutes acceptance of the current terms.
          </p>

          <h2 class="text-lg font-semibold text-gray-900 pt-2">Contact</h2>
          <p>
            Questions can be directed to the Company at{" "}
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
  title: "Terms of Use — The Safety House",
};
