import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      <div class="bg-gradient-to-br from-dark to-[#2d2d2d] text-white py-16 px-8 text-center">
        <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Accessibility</h1>
        <p class="text-white/60 text-base max-w-[520px] mx-auto leading-relaxed">
          Our commitment to an inclusive shopping experience.
        </p>
      </div>

      <div class="max-w-3xl mx-auto px-6 py-12 text-gray-700 dark:text-gray-300 leading-relaxed">
        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Our Commitment</h2>
          <p>
            The Safety House is committed to providing an accessible website and shopping experience
            for all customers, including people with disabilities. We strive to meet the Web Content
            Accessibility Guidelines (WCAG) 2.1 Level AA standards and comply with the Accessibility
            for Ontarians with Disabilities Act (AODA).
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Accessibility Features</h2>
          <ul class="list-disc pl-6 space-y-1.5">
            <li><strong>Dark mode</strong> — A system-aware dark theme reduces eye strain and improves readability for users with light sensitivity or low vision.</li>
            <li><strong>Keyboard navigation</strong> — All interactive elements are accessible via keyboard, including menus, filters, product cards, and the shopping cart.</li>
            <li><strong>Semantic HTML</strong> — Proper heading structure, landmarks, and ARIA attributes help screen readers navigate the site effectively.</li>
            <li><strong>Accessible components</strong> — Our interactive components (modals, dropdowns, filters) use ARIA-compliant headless UI components.</li>
            <li><strong>Color contrast</strong> — Text and interactive elements meet WCAG AA contrast ratios in both light and dark modes.</li>
            <li><strong>Responsive design</strong> — The site works across all screen sizes, from mobile phones to desktop monitors.</li>
            <li><strong>Alt text</strong> — Product images include descriptive alternative text for screen readers.</li>
            <li><strong>Focus indicators</strong> — Visible focus outlines on all interactive elements for keyboard users.</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">In-Store Accessibility</h2>
          <p>
            Our retail location at 595 West Hunt Club Road is wheelchair accessible with ground-level
            entry and wide aisles. Our staff are happy to assist customers with any accessibility needs.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Feedback</h2>
          <p>
            We welcome feedback on the accessibility of our website and services. If you encounter
            any barriers or have suggestions for improvement, please contact us:
          </p>
          <ul class="list-none mt-3 space-y-1.5">
            <li>Email: <a href="mailto:info@safetyhouse.ca" class="text-primary hover:underline">info@safetyhouse.ca</a></li>
            <li>Phone: <a href="tel:613-224-6804" class="text-primary hover:underline">613-224-6804</a></li>
            <li>In person: 595 West Hunt Club Rd, Nepean, ON K2G 5X6</li>
          </ul>
          <p class="mt-3">
            We aim to respond to accessibility feedback within 5 business days.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Ongoing Efforts</h2>
          <p>
            Accessibility is an ongoing effort. We regularly review our website and make improvements
            to ensure the best possible experience for all users. This statement was last reviewed in
            March 2026.
          </p>
        </section>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "Accessibility | The Safety House",
  meta: [
    {
      name: "description",
      content: "Accessibility statement for The Safety House — our commitment to an inclusive shopping experience for all customers.",
    },
  ],
};
