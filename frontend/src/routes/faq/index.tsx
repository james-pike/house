import { component$, useSignal, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

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
      {/* Hero */}
      <div class="bg-gradient-to-br from-dark to-[#2d2d2d] text-white aspect-video px-8 text-center flex flex-col items-center justify-center">
        <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
          Frequently Asked Questions
        </h1>
        <p class="text-white/60 text-base max-w-[520px] mx-auto leading-relaxed">
          Everything you need to know about The Safety House.
        </p>
      </div>

      {/* FAQ Content */}
      <section class="px-4 md:px-8 py-16 md:py-24">
        <div class="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10 md:gap-16">
          {/* Sidebar */}
          <div>
            <p class="text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Got Questions?</p>
            <h2 class="text-2xl font-extrabold tracking-tight mb-4 text-dark dark:text-white">
              We've got answers
            </h2>
            <p class="text-gray-500 dark:text-gray-400 leading-relaxed text-[0.95rem] mb-6">
              Can't find what you're looking for? Reach us at{" "}
              <a href="tel:613-224-6804" class="text-primary font-semibold hover:text-primary-dark transition-colors">
                613-224-6804
              </a>{" "}
              or{" "}
              <a href="mailto:info@safetyhouse.ca" class="text-primary font-semibold hover:text-primary-dark transition-colors">
                info@safetyhouse.ca
              </a>
            </p>
            <div class="hidden md:block rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-dark to-[#2d2d2d] p-8 flex items-end">
              <div>
                <p class="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Visit Us</p>
                <p class="text-white/70 text-sm leading-relaxed">
                  595 West Hunt Club Road<br />
                  Nepean, ON K2G 5X6<br /><br />
                  Mon–Sat &bull; 613-224-6804
                </p>
              </div>
            </div>
          </div>

          {/* Accordion */}
          <div class="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div
                key={faq.q}
                class="bg-white dark:bg-[#1e1e1e] border border-warm rounded-xl overflow-hidden transition-shadow duration-200 hover:shadow-sm"
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
      </section>
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
