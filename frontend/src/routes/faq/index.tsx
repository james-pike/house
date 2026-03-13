import { component$, useSignal, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

// Topstitch L-corners for text panels — uses currentColor
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
      <line x1="-8" y1="1" x2="60" y2="1" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      <line x1="1" y1="-8" x2="1" y2="60" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
    </svg>
    <svg class="absolute bottom-7 right-7 pointer-events-none overflow-visible hidden md:block [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.12))]" width="60" height="60" viewBox="0 0 60 60" fill="none" aria-hidden="true">
      <line x1="0" y1="59" x2="68" y2="59" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      <line x1="59" y1="0" x2="59" y2="68" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
    </svg>
  </>
));

// Image angle brackets — white on dark overlay
const ImageBrackets = component$(() => (
  <>
    <svg class="absolute top-3 left-3 md:top-4 md:left-4 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <line x1="-6" y1="1" x2="40" y2="1" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      <line x1="1" y1="-6" x2="1" y2="40" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
    </svg>
    <svg class="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <line x1="0" y1="39" x2="46" y2="39" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
      <line x1="39" y1="0" x2="39" y2="46" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
    </svg>
  </>
));

const canvasTexture = `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.025'%3E%3Crect x='0' y='0' width='1' height='1'/%3E%3Crect x='3' y='3' width='1' height='1'/%3E%3C/g%3E%3C/svg%3E")`;

const textPanelClasses = "relative flex flex-col justify-center px-8 py-12 md:px-14 md:py-16 bg-white dark:bg-[#1e1e1e] text-[#9ca3af50] md:text-[#9ca3af70] dark:text-[#6b728035] dark:md:text-[#6b728050] stitch-line-h stitch-line-h-bottom stitch-dark";

const StitchBorder = component$(() => (
  <div class="absolute inset-3 md:inset-5 stitch-box-overlay pointer-events-none z-[1] [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.15))]" />
));

export default component$(() => {
  const openIndex = useSignal(-1);

  const toggle = $((i: number) => {
    openIndex.value = openIndex.value === i ? -1 : i;
  });

  const faqs = [
    {
      q: "Where is The Safety House located?",
      a: "Our store is located at 595 West Hunt Club Road in Nepean, Ontario (K2G 5X6). We're easy to find and offer ample parking for our customers.",
    },
    {
      q: "What are the store hours?",
      a: "Monday to Wednesday: 8:30 AM - 6:00 PM, Thursday: 8:30 AM - 7:00 PM, Friday: 8:30 AM - 6:00 PM, Saturday: 9:00 AM - 4:00 PM, Sunday: Closed. December Sundays: 10:00 AM - 4:00 PM. We are closed on long weekends.",
    },
    {
      q: "Which safety footwear brands do you carry?",
      a: "We carry a wide selection of CSA-approved footwear including Vismo, Timberland Pro, Red Wing, Blundstone, Canada West, Redback, Muck, Royer, Dunlap, Baffin, Terra, Keen, and Swat.",
    },
    {
      q: "What workwear brands are available?",
      a: "Our workwear selection includes Carhartt, Blakl\u00e4der, Tough Duck, Gatts, Red Cap, Orange, Oberon, Pioneer, Viking, Canada Sportswear (CX2), Stormtech, Big Bill, and Dickies.",
    },
    {
      q: "Do you carry sportswear and casual apparel?",
      a: "Yes! We stock Stormtech, Trimark, Gildan, Nike, Adidas, Puma, Champion, Roots, Eddie Bauer, Spyder, and many more brands for both sportswear and casual apparel.",
    },
    {
      q: "What headwear brands do you offer?",
      a: "We carry New Era, Flexfit, Yupoong, OGIO, Cap America, and Calloway headwear.",
    },
    {
      q: "Do you offer embroidery and customization services?",
      a: "Yes! We offer in-house embroidery and transfer services. Our Decoration Done Right service provides timely, budget-conscious personalization for companies, schools, teams, and organizations.",
    },
    {
      q: "How can I contact The Safety House?",
      a: "You can reach us by phone at 613-224-6804 or by email at info@safetyhouse.ca. You're also welcome to visit us at our store on West Hunt Club Road.",
    },
  ];

  return (
    <>
      {/* Hero Banner */}
      <div class="relative bg-gradient-to-br from-dark to-[#2d2d2d] text-white py-16 px-8 text-center stitch-line-h-bottom stitch-light overflow-hidden">
        <div class="stitch-v-seams stitch-light" />
        <div class="absolute inset-0 stitch-box-overlay pointer-events-none z-10 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.25))]" />
        <ImageBrackets />
        <h1 class="relative z-10 text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
          Frequently Asked Questions
        </h1>
        <p class="relative z-10 text-white/60 text-base max-w-[520px] mx-auto leading-relaxed">
          Everything you need to know about The Safety House.
        </p>
      </div>

      {/* Section 1 — Sidebar text panel left, FAQ accordion right */}
      <div class="grid grid-cols-1 md:grid-cols-[1fr_2fr]">
        {/* Sidebar panel */}
        <div class={textPanelClasses}>
          <div class="stitch-v-seams stitch-dark" />
          <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: canvasTexture }} />
          <div class="absolute inset-0 pointer-events-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.06),inset_0_-1px_2px_rgba(0,0,0,0.04)]" />
          <StitchBorder />
          <StitchCorners />
          <p class="relative text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Got Questions?</p>
          <h2 class="relative text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
            We've got answers
          </h2>
          <p class="relative text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-6">
            Can't find what you're looking for? Reach us at{" "}
            <a href="tel:613-224-6804" class="text-primary font-semibold hover:text-primary-dark transition-colors">
              613-224-6804
            </a>{" "}
            or{" "}
            <a href="mailto:info@safetyhouse.ca" class="text-primary font-semibold hover:text-primary-dark transition-colors">
              info@safetyhouse.ca
            </a>
          </p>
          <div class="relative hidden md:block">
            <p class="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-widest font-semibold mb-2">Visit Us</p>
            <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              595 West Hunt Club Road<br />
              Nepean, ON K2G 5X6<br /><br />
              Mon&ndash;Sat &bull; 613-224-6804
            </p>
          </div>
        </div>

        {/* Accordion panel */}
        <div class="relative bg-[#fafaf9] dark:bg-[#171717] stitch-line-h stitch-line-h-bottom stitch-dark">
          <div class="stitch-v-seams stitch-dark" />
          <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: canvasTexture }} />
          <div class="px-6 py-10 md:px-10 md:py-14">
            <div class="relative flex flex-col gap-3">
              {faqs.map((faq, i) => (
                <div
                  key={faq.q}
                  class="relative bg-white dark:bg-[#1e1e1e] overflow-hidden transition-shadow duration-200 hover:shadow-sm stitch-box-overlay"
                >
                  <button
                    onClick$={() => toggle(i)}
                    class="w-full flex items-center justify-between p-5 md:p-6 text-left bg-transparent border-none"
                  >
                    <span class="text-[0.95rem] font-semibold text-dark dark:text-white pr-4">{faq.q}</span>
                    <span
                      class={`text-gray-400 text-xl flex-shrink-0 transition-transform duration-200 ${
                        openIndex.value === i ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <div
                    class={`grid transition-all duration-200 ${
                      openIndex.value === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div class="overflow-hidden">
                      <p class="px-5 md:px-6 pb-5 md:pb-6 text-gray-500 dark:text-gray-400 text-[0.9rem] leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "FAQ | The Safety House",
  meta: [
    {
      name: "description",
      content:
        "Frequently asked questions about The Safety House - location, hours, brands, embroidery services, and more.",
    },
  ],
};
