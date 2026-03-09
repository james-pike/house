import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      <div class="bg-gradient-to-br from-dark to-[#2d2d2d] text-white py-16 px-8 text-center">
        <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Privacy Policy</h1>
        <p class="text-white/60 text-base max-w-[520px] mx-auto leading-relaxed">
          How we collect, use, and protect your information.
        </p>
      </div>

      <div class="max-w-3xl mx-auto px-6 py-12 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p class="text-sm text-gray-400 dark:text-gray-500 mb-8">Last updated: March 2026</p>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Who We Are</h2>
          <p>
            The Safety House is a retail store located at 595 West Hunt Club Road, Nepean, Ontario K2G 5X6.
            We sell workwear, safety footwear, flame resistant clothing, casual apparel, and provide in-house
            embroidery services. You can reach us at 613-224-6804 or info@safetyhouse.ca.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Information We Collect</h2>
          <p class="mb-3">We may collect the following information when you interact with us:</p>
          <ul class="list-disc pl-6 space-y-1.5">
            <li><strong>Contact information</strong> — name, email address, phone number, and shipping address when you place an order or contact us.</li>
            <li><strong>Order information</strong> — products purchased, order history, and payment details (processed securely by our payment provider).</li>
            <li><strong>Browsing data</strong> — anonymous, aggregated website usage statistics. We use Cloudflare Web Analytics, which is cookieless and does not track individual users.</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">How We Use Your Information</h2>
          <ul class="list-disc pl-6 space-y-1.5">
            <li>To process and fulfill your orders</li>
            <li>To communicate with you about your orders or inquiries</li>
            <li>To improve our website and product offerings</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Cookies and Tracking</h2>
          <p>
            Our website does not use tracking cookies. We use Cloudflare Web Analytics, a privacy-first
            analytics service that does not use cookies, does not track individual users, and does not
            collect personal information. No cookie consent banner is required.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Data Sharing</h2>
          <p>
            We do not sell, rent, or trade your personal information. We may share your information only with:
          </p>
          <ul class="list-disc pl-6 space-y-1.5 mt-3">
            <li><strong>Payment processors</strong> — to securely process transactions.</li>
            <li><strong>Shipping providers</strong> — to deliver your orders.</li>
            <li><strong>Legal authorities</strong> — if required by law.</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Data Security</h2>
          <p>
            We take reasonable measures to protect your personal information, including encrypted
            connections (HTTPS), secure payment processing, and limited access to personal data.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Your Rights</h2>
          <p>
            Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), you have
            the right to:
          </p>
          <ul class="list-disc pl-6 space-y-1.5 mt-3">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Withdraw consent for future use of your information</li>
          </ul>
          <p class="mt-3">
            To exercise these rights, contact us at info@safetyhouse.ca or call 613-224-6804.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this page with an
            updated revision date.
          </p>
        </section>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "Privacy Policy | The Safety House",
  meta: [
    {
      name: "description",
      content: "Privacy policy for The Safety House — how we collect, use, and protect your personal information.",
    },
  ],
};
