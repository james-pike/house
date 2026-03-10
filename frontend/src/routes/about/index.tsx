import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      {/* Section 1 — Text left, image right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="flex flex-col justify-center px-8 py-12 md:px-14 md:py-16 bg-white dark:bg-[#1e1e1e] order-2 md:order-1">
          <p class="text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Who We Are</p>
          <h2 class="text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            The Safety House
          </h2>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-4">
            The Safety House focuses on offering key products on time by employing
            the latest technologies, selecting reliable suppliers, and maintaining
            personable staff to address customer needs.
          </p>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem]">
            We are your one stop shop for quality specialized clothing, safety
            footwear, and in-house embroidery services.
          </p>
        </div>
        <div class="aspect-[16/9] md:aspect-auto order-1 md:order-2">
          <img
            src="/TheSafetyHouse-March2023-38.jpg"
            alt="The Safety House team"
            width={800}
            height={800}
            class="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Section 2 — Image left, text right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="aspect-square md:aspect-auto">
          <img
            src="/TheSafetyHouse-March2023-37.jpg"
            alt="In-house embroidery services at The Safety House"
            width={800}
            height={800}
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex flex-col justify-center px-8 py-12 md:px-14 md:py-16 bg-white dark:bg-[#1e1e1e]">
          <p class="text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">What We Do</p>
          <h2 class="text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            Apparel Supply &amp; Embroidery
          </h2>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-4">
            The Safety House specializes in apparel supply and embroidery for
            construction workwear, medical apparel, casual wear, and
            promotional products.
          </p>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem]">
            We offer quality footwear, protective clothing, and safety attire
            with personalization services all in one location.
          </p>
        </div>
      </div>

      {/* Section 3 — Text left, image right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="flex flex-col justify-center px-8 py-12 md:px-14 md:py-16 bg-white dark:bg-[#1e1e1e] order-2 md:order-1">
          <p class="text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Our Team</p>
          <h2 class="text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            The Experts
          </h2>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-4">
            Our management team brings years of successful apparel market
            experience. We emphasize superior design, sourcing, integrated
            promotion, and focused customer support with the highest integrity in
            the market.
          </p>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem]">
            From safety gear to school wear, our experts help you find exactly
            what you need with personalized attention to every order.
          </p>
        </div>
        <div class="aspect-square md:aspect-auto order-1 md:order-2">
          <img
            src="/footwear.jpg"
            alt="Safety footwear at The Safety House"
            width={800}
            height={800}
            class="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Section 4 — Image left, text right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="aspect-square md:aspect-auto">
          <img
            src="/TheSafetyHouse-March2023-37.jpg"
            alt="The Safety House storefront"
            width={800}
            height={800}
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex flex-col justify-center px-8 py-12 md:px-14 md:py-16 bg-white dark:bg-[#1e1e1e]">
          <p class="text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Our Commitment</p>
          <h2 class="text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            Promise &amp; Community
          </h2>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-4">
            We are committed to delivering products that meet customer needs
            through quality, unquestionable reliability, and superior customer
            service. We listen to our customers and anticipate their needs to
            ensure every experience exceeds expectations.
          </p>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem]">
            The Safety House maintains long-term relationships built on respect
            and fairness. We serve customers throughout Canada via
            repeat business and referrals, and we're proud of the community
            we've built over the years.
          </p>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "About Us | The Safety House",
  meta: [
    {
      name: "description",
      content:
        "The Safety House - quality specialized clothing, CSA safety footwear, and in-house embroidery services in Nepean, Ontario.",
    },
  ],
};
