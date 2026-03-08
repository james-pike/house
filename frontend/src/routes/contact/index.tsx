import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      {/* Hero */}
      <div class="bg-gradient-to-br from-dark to-[#2d2d2d] text-white aspect-video px-8 text-center flex flex-col items-center justify-center">
        <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Contact Us</h1>
        <p class="text-white/60 text-base max-w-[520px] mx-auto leading-relaxed">
          We'd love to hear from you. Visit us in-store, call, or send an email.
        </p>
      </div>

      {/* Contact Info — image left, details right */}
      <section class="px-4 md:px-8 py-16 md:py-24">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div class="rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src="/footwear.jpg"
              alt="The Safety House store"
              width={600}
              height={450}
              class="w-full h-full object-cover"
            />
          </div>
          <div>
            <p class="text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Reach Us</p>
            <h2 class="text-2xl md:text-3xl font-extrabold tracking-tight mb-6 text-dark dark:text-white">
              We're Here to Help
            </h2>
            <div class="space-y-5">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg flex-shrink-0">
                  &#9742;
                </div>
                <div>
                  <p class="text-sm font-semibold text-dark dark:text-white mb-0.5">Phone &amp; Fax</p>
                  <a
                    href="tel:613-224-6804"
                    class="text-primary font-semibold text-[0.95rem] transition-colors hover:text-primary-dark"
                  >
                    613-224-6804
                  </a>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg flex-shrink-0">
                  &#9993;
                </div>
                <div>
                  <p class="text-sm font-semibold text-dark dark:text-white mb-0.5">Email</p>
                  <a
                    href="mailto:info@safetyhouse.ca"
                    class="text-primary font-semibold text-[0.95rem] transition-colors hover:text-primary-dark"
                  >
                    info@safetyhouse.ca
                  </a>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg flex-shrink-0">
                  &#9873;
                </div>
                <div>
                  <p class="text-sm font-semibold text-dark dark:text-white mb-0.5">Address</p>
                  <p class="text-gray-500 dark:text-gray-400 text-[0.95rem] leading-relaxed">
                    595 West Hunt Club Road<br />
                    Nepean, ON K2G 5X6
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div class="px-8">
        <div class="border-t border-gray-200 dark:border-gray-800" />
      </div>

      {/* Hours — text left, visual right */}
      <section class="px-4 md:px-8 py-16 md:py-24">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div class="order-2 md:order-1">
            <p class="text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Visit Us</p>
            <h2 class="text-2xl md:text-3xl font-extrabold tracking-tight mb-6 text-dark dark:text-white">
              Store Hours
            </h2>
            <table class="w-full border-collapse">
              <tbody>
                {[
                  ["Monday", "8:30 AM - 6:00 PM"],
                  ["Tuesday", "8:30 AM - 6:00 PM"],
                  ["Wednesday", "8:30 AM - 6:00 PM"],
                  ["Thursday", "8:30 AM - 7:00 PM"],
                  ["Friday", "8:30 AM - 6:00 PM"],
                  ["Saturday", "9:00 AM - 4:00 PM"],
                  ["Sunday", "Closed"],
                ].map(([day, hours]) => (
                  <tr key={day}>
                    <td class="py-2.5 text-[0.95rem] border-b border-gray-200 dark:border-gray-700 font-semibold text-dark dark:text-white">
                      {day}
                    </td>
                    <td class="py-2.5 text-[0.95rem] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 text-right">
                      {hours}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Closed on long weekends. December Sundays: 10:00 AM - 4:00 PM.
            </p>
          </div>
          <div class="order-1 md:order-2 rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary/90 to-primary-dark flex items-center justify-center p-10">
            <div class="text-center">
              <div class="text-5xl mb-4">&#128197;</div>
              <p class="text-white font-bold text-lg">Mon &ndash; Sat</p>
              <p class="text-white/70 text-sm mt-1">Open 6 days a week for you</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
});

export const head: DocumentHead = {
  title: "Contact | The Safety House",
  meta: [
    {
      name: "description",
      content:
        "Contact The Safety House at 595 West Hunt Club Road, Nepean, ON. Phone: 613-224-6804. Email: info@safetyhouse.ca.",
    },
  ],
};
