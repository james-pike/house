import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

// Topstitch L-corners — lighter on mobile, stronger on desktop
const StitchCorners = component$(() => (
  <>
    {/* Mobile — subtle */}
    <svg class="absolute top-5 left-5 w-8 h-8 pointer-events-none overflow-visible md:hidden" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <line x1="-6" y1="1" x2="40" y2="1" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      <line x1="1" y1="-6" x2="1" y2="40" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
    </svg>
    <svg class="absolute bottom-5 right-5 w-8 h-8 pointer-events-none overflow-visible md:hidden" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <line x1="0" y1="39" x2="46" y2="39" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      <line x1="39" y1="0" x2="39" y2="46" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
    </svg>
    {/* Desktop — stronger with drop-shadow */}
    <svg class="absolute top-7 left-7 pointer-events-none overflow-visible hidden md:block [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.12))]" width="60" height="60" viewBox="0 0 60 60" fill="none" aria-hidden="true">
      <line x1="-8" y1="1" x2="60" y2="1" stroke="currentColor" stroke-width="1" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      <line x1="1" y1="-8" x2="1" y2="60" stroke="currentColor" stroke-width="1" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
    </svg>
    <svg class="absolute bottom-7 right-7 pointer-events-none overflow-visible hidden md:block [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.12))]" width="60" height="60" viewBox="0 0 60 60" fill="none" aria-hidden="true">
      <line x1="0" y1="59" x2="68" y2="59" stroke="currentColor" stroke-width="1" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      <line x1="59" y1="0" x2="59" y2="68" stroke="currentColor" stroke-width="1" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
    </svg>
  </>
));

// Subtle woven canvas texture overlay
const canvasTexture = `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.025'%3E%3Crect x='0' y='0' width='1' height='1'/%3E%3Crect x='3' y='3' width='1' height='1'/%3E%3C/g%3E%3C/svg%3E")`;

const textPanelClasses = "relative flex flex-col justify-center px-8 py-12 md:px-14 md:py-16 bg-white dark:bg-[#1e1e1e] text-[#9ca3af50] md:text-[#9ca3af70] dark:text-[#6b728035] dark:md:text-[#6b728050]";

// Dashed stitch border — lighter on mobile, stronger on desktop
const StitchBorder = component$(() => (
  <div class="absolute inset-3 md:inset-5 stitch-box-overlay pointer-events-none z-[1] [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.15))]" />
));

export default component$(() => {
  return (
    <>
      {/* Section 1 — Text left, image right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class={`${textPanelClasses} order-2 md:order-1`}>
          <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: canvasTexture }} />
          <div class="absolute inset-0 pointer-events-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.06),inset_0_-1px_2px_rgba(0,0,0,0.04)]" />
          <StitchBorder />
          <StitchCorners />
          <p class="relative text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Who We Are</p>
          <h2 class="relative text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            The Safety House
          </h2>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-4">
            The Safety House focuses on offering key products on time by employing
            the latest technologies, selecting reliable suppliers, and maintaining
            personable staff to address customer needs.
          </p>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem]">
            We are your one stop shop for quality specialized clothing, safety
            footwear, and in-house embroidery services.
          </p>
        </div>
        <div class="aspect-[16/10] md:aspect-auto md:relative overflow-hidden order-1 md:order-2">
          <img
            src="/TheSafetyHouse-March2023-38.jpg"
            alt="The Safety House team"
            width={800}
            height={800}
            class="w-full h-full object-cover md:absolute md:inset-0"
          />
        </div>
      </div>

      {/* Section 2 — Image left, text right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="aspect-[16/10] md:aspect-auto md:relative overflow-hidden">
          <img
            src="/TheSafetyHouse-March2023-37.jpg"
            alt="In-house embroidery services at The Safety House"
            width={800}
            height={800}
            class="w-full h-full object-cover md:absolute md:inset-0"
          />
        </div>
        <div class={textPanelClasses}>
          <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: canvasTexture }} />
          <div class="absolute inset-0 pointer-events-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.06),inset_0_-1px_2px_rgba(0,0,0,0.04)]" />
          <StitchBorder />
          <StitchCorners />
          <p class="relative text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">What We Do</p>
          <h2 class="relative text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            Apparel Supply &amp; Embroidery
          </h2>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-4">
            The Safety House specializes in apparel supply and embroidery for
            construction workwear, medical apparel, casual wear, and
            promotional products.
          </p>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem]">
            We offer quality footwear, protective clothing, and safety attire
            with personalization services all in one location.
          </p>
        </div>
      </div>

      {/* Section 3 — Text left, image right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class={`${textPanelClasses} order-2 md:order-1`}>
          <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: canvasTexture }} />
          <div class="absolute inset-0 pointer-events-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.06),inset_0_-1px_2px_rgba(0,0,0,0.04)]" />
          <StitchBorder />
          <StitchCorners />
          <p class="relative text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Our Team</p>
          <h2 class="relative text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            The Experts
          </h2>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-4">
            Our management team brings years of successful apparel market
            experience. We emphasize superior design, sourcing, integrated
            promotion, and focused customer support with the highest integrity in
            the market.
          </p>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem]">
            From safety gear to school wear, our experts help you find exactly
            what you need with personalized attention to every order.
          </p>
        </div>
        <div class="aspect-[16/10] md:aspect-auto md:relative overflow-hidden order-1 md:order-2">
          <img
            src="/footwear.jpg"
            alt="Safety footwear at The Safety House"
            width={800}
            height={800}
            class="w-full h-full object-cover md:absolute md:inset-0"
          />
        </div>
      </div>

      {/* Section 4 — Image left, text right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="aspect-[16/10] md:aspect-auto md:relative overflow-hidden">
          <img
            src="/TheSafetyHouse-March2023-37.jpg"
            alt="The Safety House storefront"
            width={800}
            height={800}
            class="w-full h-full object-cover md:absolute md:inset-0"
          />
        </div>
        <div class={textPanelClasses}>
          <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: canvasTexture }} />
          <div class="absolute inset-0 pointer-events-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.06),inset_0_-1px_2px_rgba(0,0,0,0.04)]" />
          <StitchBorder />
          <StitchCorners />
          <p class="relative text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Our Commitment</p>
          <h2 class="relative text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            Promise &amp; Community
          </h2>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-4">
            We are committed to delivering products that meet customer needs
            through quality, unquestionable reliability, and superior customer
            service. We listen to our customers and anticipate their needs to
            ensure every experience exceeds expectations.
          </p>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem]">
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
