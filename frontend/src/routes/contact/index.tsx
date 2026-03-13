import { component$ } from "@builder.io/qwik";
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
  return (
    <>
      {/* Hero Banner */}
      <div class="relative bg-gradient-to-br from-dark to-[#2d2d2d] text-white py-16 px-8 text-center stitch-line-h-bottom stitch-light overflow-hidden">
        <div class="stitch-v-seams stitch-light" />
        <div class="absolute inset-0 stitch-box-overlay pointer-events-none z-10 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.25))]" />
        <ImageBrackets />
        <h1 class="relative z-10 text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Contact Us</h1>
        <p class="relative z-10 text-white/60 text-base max-w-[520px] mx-auto leading-relaxed">
          We'd love to hear from you. Visit us in-store, call, or send an email.
        </p>
      </div>

      {/* Section 1 — Image left, contact details right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class="aspect-[16/10] md:aspect-auto md:relative overflow-hidden relative">
          <img
            src="/footwear.jpg"
            alt="The Safety House store"
            width={800}
            height={800}
            class="w-full h-full object-cover md:absolute md:inset-0"
          />
          <div class="absolute inset-0 bg-black/20" />
          <div class="absolute inset-0 stitch-box-overlay pointer-events-none z-10 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.25))]" />
          <ImageBrackets />
        </div>
        <div class={textPanelClasses}>
          <div class="stitch-v-seams stitch-dark" />
          <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: canvasTexture }} />
          <div class="absolute inset-0 pointer-events-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.06),inset_0_-1px_2px_rgba(0,0,0,0.04)]" />
          <StitchBorder />
          <StitchCorners />
          <p class="relative text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Reach Us</p>
          <h2 class="relative text-2xl md:text-4xl font-extrabold tracking-tight mb-6 text-dark dark:text-white">
            We're Here to Help
          </h2>
          <div class="relative space-y-5">
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

      {/* Section 2 — Hours left, visual right */}
      <div class="grid grid-cols-1 md:grid-cols-2">
        <div class={`${textPanelClasses} order-2 md:order-1`}>
          <div class="stitch-v-seams stitch-dark" />
          <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: canvasTexture }} />
          <div class="absolute inset-0 pointer-events-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.06),inset_0_-1px_2px_rgba(0,0,0,0.04)]" />
          <StitchBorder />
          <StitchCorners />
          <p class="relative text-xs uppercase tracking-[0.15em] text-primary font-bold mb-3">Visit Us</p>
          <h2 class="relative text-2xl md:text-4xl font-extrabold tracking-tight mb-6 text-dark dark:text-white">
            Store Hours
          </h2>
          <table class="relative w-full border-collapse">
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
                  <td class="py-2.5 text-[0.95rem] border-b border-warm font-semibold text-dark dark:text-white">
                    {day}
                  </td>
                  <td class="py-2.5 text-[0.95rem] text-gray-500 dark:text-gray-400 border-b border-warm text-right">
                    {hours}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="relative mt-4 text-sm text-gray-500 dark:text-gray-400">
            Closed on long weekends. December Sundays: 10:00 AM - 4:00 PM.
          </p>
        </div>
        <div class="aspect-[16/10] md:aspect-auto md:relative overflow-hidden order-1 md:order-2 relative">
          <img
            src="/TheSafetyHouse-March2023-38.jpg"
            alt="The Safety House team"
            width={800}
            height={800}
            class="w-full h-full object-cover md:absolute md:inset-0"
          />
          <div class="absolute inset-0 bg-black/20" />
          <div class="absolute inset-0 stitch-box-overlay pointer-events-none z-10 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.25))]" />
          <ImageBrackets />
        </div>
      </div>
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
