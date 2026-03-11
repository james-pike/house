import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {

  const categories = [
    {
      name: "Work Wear",
      handle: "work-wear",
      desc: "Professional clothing for the job site",
      img: "/workwear.jpg",
    },
    {
      name: "Safety Footwear",
      handle: "safety-footwear",
      desc: "CSA-approved boots and shoes",
      img: "/footwear.jpg",
    },
    {
      name: "Flame Resistant",
      handle: "flame-resistant",
      desc: "Specialized protective garments",
      img: "/flame-resistant-clothing.jpg",
    },
{
      name: "Casual Wear",
      handle: "school-wear",
      desc: "Everyday and casual apparel",
      img: "/schoolwear.jpg",
    },
  ];

  const brands = [
    { name: "Carhartt", img: "/brands/carhart.png", url: "https://www.carhartt.com" },
    { name: "Timberland Pro", img: "/brands/timberland-pro.png", url: "https://www.timberland.com/timberlandpro" },
    { name: "Blakl\u00e4der", img: "/brands/blaklader.png", url: "https://www.blaklader.com" },
    { name: "Pioneer", img: "/brands/pioneer.png", url: "https://www.pioneerprotective.com" },
    { name: "Viking", img: "/brands/viking_work_wear.png", url: "https://www.viking.ca" },
    { name: "Big Bill", img: "/brands/big_bill_workwear.png", url: "https://www.bigbill.com" },
    { name: "Dickies", img: "/brands/dickies_workwear_ottawa.png", url: "https://www.dickies.ca" },
    { name: "Tough Duck", img: "/brands/TOUGHDUCK.png", url: "https://www.toughduck.com" },
    { name: "Blundstone", img: "/brands/blunstone_logo.png", url: "https://www.blundstone.ca" },
    { name: "Keen", img: "/brands/keen.png", url: "https://www.keenfootwear.com" },
    { name: "Red Wing", img: "/brands/red-wing-shoes.png", url: "https://www.redwingshoes.com" },
    { name: "Baffin", img: "/brands/baffin.png", url: "https://www.bfreinc.com/baffin" },
    { name: "Canada West", img: "/brands/canada-west-boots-logo-1.png", url: "https://www.canadawestboots.com" },
    { name: "Royer", img: "/brands/royer.png", url: "https://www.royer.com" },
    { name: "Rasco", img: "/brands/rasco.png", url: "https://www.rfrasco.com" },
    { name: "JB Goodhue", img: "/brands/jb-goodhue.png", url: "https://www.jbgoodhue.com" },
  ];

  const expandedBrand = useSignal<string | null>(null);

  const currentSlide = useSignal(0);
  const paused = useSignal(false);
  const touchStartX = useSignal(0);

  // Auto-advance through all slides once, then stop on slide 0
  useVisibleTask$(({ cleanup }) => {
    const lastIndex = 2;
    const id = setInterval(() => {
      if (paused.value) return;
      if (currentSlide.value < lastIndex) {
        currentSlide.value++;
      } else {
        currentSlide.value = 0;
        clearInterval(id);
      }
    }, 6000);
    cleanup(() => clearInterval(id));
  });

  const heroSlides = [
    {
      image: "/hero.jpg",
      badge: "Canada's Safety Experts",
      title: <>Where Work &amp;<br />Lifestyle Apparel<br /><em class="not-italic text-primary">Intersect</em></>,
      description: "Your one-stop shop for quality workwear, CSA safety footwear, and in-house embroidery services in Ottawa.",
    },
    {
      image: "/footwear.jpg",
      badge: "CSA Approved",
      title: <>Safety Footwear<br />Built to<br /><em class="not-italic text-primary">Protect</em></>,
      description: "CSA-approved boots and shoes from trusted brands like Timberland Pro, Red Wing, and Blundstone.",
    },
    {
      image: "/embroidery.jpg",
      badge: "In-House Embroidery",
      title: <>Custom<br />Decoration for<br />Your <em class="not-italic text-primary">Team</em></>,
      description: "Timely, budget-conscious embroidery and transfer services for your company, school, or organization.",
    },
  ];

  return (
    <>
      {/* Hero Carousel */}
      <section
        class="relative overflow-hidden"
        onMouseEnter$={() => { paused.value = true; }}
        onMouseLeave$={() => { paused.value = false; }}
        onTouchStart$={(e: TouchEvent) => { touchStartX.value = e.touches[0].clientX; }}
        onTouchEnd$={(e: TouchEvent) => {
          const diff = touchStartX.value - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            const last = heroSlides.length - 1;
            if (diff > 0 && currentSlide.value < last) {
              currentSlide.value++;
            } else if (diff < 0 && currentSlide.value > 0) {
              currentSlide.value--;
            }
          }
        }}
      >
        {heroSlides.map((slide, i) => (
          <div
            key={i}
            class={`text-white overflow-hidden transition-opacity duration-700 ease-in-out flex items-center ${
              i === 0 ? "relative h-[340px] md:h-[clamp(340px,45vw,520px)]" : "absolute top-0 left-0 w-full h-full"
            } ${currentSlide.value === i ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            aria-hidden={currentSlide.value !== i}
          >
            <img
              src={slide.image}
              alt=""
              width={1400}
              height={600}
              class="absolute inset-0 w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div class="absolute inset-0 shadow-[inset_0_0_60px_20px_rgba(0,0,0,0.6)] pointer-events-none" />
            {/* Stitch corner accents — overshoot past the corner */}
            <svg class="absolute top-4 left-4 md:top-6 md:left-8 w-10 h-10 md:w-14 md:h-14 pointer-events-none z-10 overflow-visible" viewBox="0 0 60 60" fill="none" aria-hidden="true">
              <line x1="-8" y1="1" x2="60" y2="1" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="4 3.5" stroke-linecap="round" />
              <line x1="1" y1="-8" x2="1" y2="60" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="4 3.5" stroke-linecap="round" />
            </svg>
            <svg class="absolute bottom-4 right-4 md:bottom-6 md:right-8 w-10 h-10 md:w-14 md:h-14 pointer-events-none z-10 overflow-visible" viewBox="0 0 60 60" fill="none" aria-hidden="true">
              <line x1="0" y1="59" x2="68" y2="59" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="4 3.5" stroke-linecap="round" />
              <line x1="59" y1="0" x2="59" y2="68" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="4 3.5" stroke-linecap="round" />
            </svg>
            <div class="relative z-10 px-6 md:px-12 max-w-xl">
              <div class="inline-block bg-primary/15 text-primary py-1 px-3 rounded-full text-[0.65rem] md:text-xs font-bold tracking-widest uppercase mb-2 border border-white/20">
                {slide.badge}
              </div>
              <h2 class="text-[clamp(1.75rem,4.5vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight mb-2 [text-shadow:0_2px_16px_rgba(0,0,0,0.5)]">
                {slide.title}
              </h2>
              <p class="text-[clamp(0.8rem,1.2vw,1rem)] text-white/60 max-w-[400px] leading-relaxed">
                {slide.description}
              </p>
            </div>
          </div>
        ))}

        {/* Square slide indicators */}
        <div class="absolute bottom-3 right-4 md:right-8 z-20 flex items-center gap-1.5">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              class={`w-2 h-2 rounded-sm border-none cursor-pointer transition-all duration-300 ${
                currentSlide.value === i
                  ? "bg-white scale-110"
                  : "bg-white/40 hover:bg-white/70"
              }`}
              onClick$={() => { currentSlide.value = i; }}
            />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section id="products" class="px-0 pt-1 pb-1">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-1">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/collections/${cat.handle}/`}
              class="group relative rounded overflow-hidden aspect-[4/3] md:aspect-[4/3] flex items-end transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <img
                src={cat.img}
                alt={cat.name}
                width={520}
                height={390}
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div class="absolute inset-0 bg-black/40 transition-opacity duration-300 group-hover:bg-black/25" />
              {/* Edge vignette — fades card edges into the page background, removed on hover */}
              <div class="absolute inset-0 shadow-[inset_0_0_50px_15px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_0_50px_15px_rgba(0,0,0,0.8)] pointer-events-none transition-opacity duration-300 group-hover:opacity-0" />
              {/* Stitch corners */}
              <svg class="absolute top-3 left-3 md:top-4 md:left-4 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <line x1="-6" y1="1" x2="40" y2="1" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 2.5" stroke-linecap="round" />
                <line x1="1" y1="-6" x2="1" y2="40" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 2.5" stroke-linecap="round" />
              </svg>
              <svg class="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <line x1="0" y1="39" x2="46" y2="39" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 2.5" stroke-linecap="round" />
                <line x1="39" y1="0" x2="39" y2="46" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 2.5" stroke-linecap="round" />
              </svg>
              <div class="relative z-10 text-left self-end w-full px-4 pb-4">
                <h3 class="text-white text-2xl font-bold">{cat.name}</h3>
                <p class="text-white/60 text-sm mt-0.5">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Brands */}
      <div
        class="relative bg-white dark:bg-[#1e1e1e] py-4 md:py-6 px-4 md:px-8 text-center stitch-line-h stitch-line-h-bottom stitch-dark"
        onMouseLeave$={() => { expandedBrand.value = null; }}
      >
        <p class="text-sm md:text-base uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 font-bold mb-3">
          Trusted Brands We Carry
        </p>
        <div class="flex flex-wrap justify-center items-center gap-x-0.5 gap-y-0 md:gap-x-1 md:gap-y-0 relative">
          {brands.map((brand) => (
            <div key={brand.name} class="relative" style={expandedBrand.value === brand.name ? { zIndex: 50 } : { zIndex: 1 }}>
              <button
                type="button"
                class={`bg-transparent border-none p-1 md:p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${expandedBrand.value === brand.name ? "" : "hover:scale-110"}`}
                onMouseEnter$={() => { expandedBrand.value = brand.name; }}
                aria-label={brand.name}
              >
                <img
                  src={brand.img}
                  alt={brand.name}
                  width={120}
                  height={48}
                  class="h-7 md:h-9 w-auto object-contain relative z-10"
                />
              </button>
              {expandedBrand.value === brand.name && (
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[280px] bg-white dark:bg-[#252525] rounded-xl shadow-2xl border border-warm flex flex-col items-center py-5 px-4 gap-3">
                  <img
                    src={brand.img}
                    alt={brand.name}
                    width={160}
                    height={64}
                    class="h-10 md:h-12 w-auto object-contain"
                  />
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    Quality workwear and safety gear trusted across Canada.
                  </p>
                  <div class="flex gap-2 w-full">
                    <Link
                      href={`/search/?q=${encodeURIComponent(brand.name)}`}
                      class="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                    >
                      Shop {brand.name}
                    </Link>
                    {brand.url && (
                      <a
                        href={brand.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg border border-warm-strong text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Visit Site
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Value Props */}
      <section class="px-0 pb-1">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-1">
          {([
            {
              img: "/footwear.jpg",
              title: "CSA Certified Quality",
              desc: "Premium CSA-approved footwear and workwear from Canada's most trusted brands.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              ),
            },
            {
              img: "/embroidery.jpg",
              title: "Custom Embroidery",
              desc: "In-house embroidery and transfer services. Budget-conscious personalization for your team.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  <path d="M8 7h8M8 11h6"/>
                </svg>
              ),
            },
            {
              img: "/hero.jpg",
              title: "Decades of Expertise",
              desc: "Years of successful apparel market experience with superior sourcing across Canada.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
                </svg>
              ),
            },
          ] as const).map((card) => (
            <div key={card.title} class="relative overflow-hidden rounded aspect-[4/3] md:aspect-[3/2] flex items-center justify-center text-center">
              <img
                src={card.img}
                alt=""
                width={600}
                height={400}
                class="absolute inset-0 w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-black/60" />
              <div class="absolute inset-0 shadow-[inset_0_0_50px_15px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_0_50px_15px_rgba(0,0,0,0.8)] pointer-events-none" />
              {/* Stitch corners */}
              <svg class="absolute top-3 left-3 md:top-4 md:left-4 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <line x1="-6" y1="1" x2="40" y2="1" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 2.5" stroke-linecap="round" />
                <line x1="1" y1="-6" x2="1" y2="40" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 2.5" stroke-linecap="round" />
              </svg>
              <svg class="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <line x1="0" y1="39" x2="46" y2="39" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 2.5" stroke-linecap="round" />
                <line x1="39" y1="0" x2="39" y2="46" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 2.5" stroke-linecap="round" />
              </svg>
              <div class="relative z-10 px-6 flex flex-col items-center">
                <div class="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm text-primary flex items-center justify-center mb-4 border border-white/20">
                  {card.icon}
                </div>
                <h3 class="text-white text-xl font-bold mb-2 tracking-tight">{card.title}</h3>
                <p class="text-white/60 text-sm leading-relaxed max-w-[280px]">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
});

export const head: DocumentHead = {
  title: "The Safety House | Where Work & Lifestyle Apparel Intersect",
  meta: [
    {
      name: "description",
      content:
        "The Safety House is your one stop shop for quality specialized clothing, CSA safety footwear, and in-house embroidery services in Nepean, Ontario.",
    },
  ],
};
