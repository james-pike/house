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
      name: "Safety Supplies",
      handle: "safety-supplies",
      desc: "Essential safety equipment and PPE",
      img: "/safety-supplies.jpg",
    },
  ];

  const currentSlide = useSignal(0);
  const paused = useSignal(false);
  const touchStartX = useSignal(0);

  // Auto-advance through all slides once, then stop on slide 0
  useVisibleTask$(({ cleanup }) => {
    const lastIndex = 3;
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
      description: "Your one-stop shop for quality workwear, CSA safety footwear, and in-house embroidery services.",
      cta: null,
      align: "center" as const,
      objectPos: "",
    },
    {
      image: "/footwear.jpg",
      badge: "CSA Approved",
      title: <>Safety Footwear<br />Built to <em class="not-italic text-primary">Protect</em></>,
      description: "CSA-approved boots and shoes from trusted brands.",
      cta: { label: "Shop Footwear", href: "/collections/safety-footwear/" },
      align: "center" as const,
      objectPos: "95% 12%",
      scale: 1.15,
    },
    {
      image: "/flame-resistant-clothing-ottawa.jpg",
      badge: "FR Certified",
      title: <>Flame Resistant<br />Built for <em class="not-italic text-primary">Safety</em></>,
      description: "Certified FR clothing to keep you protected on the job.",
      cta: { label: "Shop Flame Resistant", href: "/collections/flame-resistant/" },
      align: "center" as const,
      objectPos: "",
    },
    {
      image: "/embroidery.jpg",
      badge: "In-House Embroidery",
      title: <>Custom Decoration<br />for Your <em class="not-italic text-primary">Team</em></>,
      description: "Timely, budget-conscious embroidery and transfer services for your company, school, or organization.",
      cta: { label: "Learn More", href: "/about/" },
      align: "center" as const,
      objectPos: "",
    },
  ];

  return (
    <>
      {/* Hero Carousel */}
      <section
        class="relative overflow-hidden mt-px stitch-line-h-bottom stitch-light"
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
        {/* Stitch border — all 4 sides */}
        <div class="absolute inset-0 stitch-box-overlay pointer-events-none z-20 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.25))]" />
        {heroSlides.map((slide, i) => (
          <div
            key={i}
            class={`text-white overflow-hidden transition-opacity duration-700 ease-in-out flex items-center ${
              slide.align === "center" ? "justify-center" : ""
            } ${
              i === 0 ? "relative h-[400px] md:h-[clamp(380px,40.5vw,468px)]" : "absolute top-0 left-0 w-full h-full"
            } ${currentSlide.value === i ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            aria-hidden={currentSlide.value !== i}
          >
            <img
              src={slide.image}
              alt=""
              width={1400}
              height={600}
              style={{
                ...(slide.objectPos ? { objectPosition: slide.objectPos } : {}),
                ...('scale' in slide && slide.scale ? { transform: `scale(${slide.scale})` } : {}),
              }}
              class="absolute inset-0 w-full h-full object-cover"
            />
            <div class={`absolute inset-0 ${
              slide.align === "center"
                ? "bg-black/50"
                : "bg-gradient-to-r from-black/70 via-black/40 to-transparent"
            }`} />
            <div class="absolute inset-0 shadow-[inset_0_0_60px_20px_rgba(0,0,0,0.3)] pointer-events-none" />
            {/* Stitch corner accents — subtle, matching border stitch scale */}
            <svg class="absolute top-4 left-4 md:top-6 md:left-6 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <line x1="-6" y1="1" x2="40" y2="1" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              <line x1="1" y1="-6" x2="1" y2="40" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
            </svg>
            <svg class="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <line x1="0" y1="39" x2="46" y2="39" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              <line x1="39" y1="0" x2="39" y2="46" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
            </svg>
            <div class={`relative z-10 max-w-2xl ${
              slide.align === "center"
                ? "mx-auto px-6 md:px-12 text-center"
                : "px-8 md:px-16"
            }`}>
              <div class="inline-block bg-primary/15 text-primary py-1 px-3 rounded-full text-[0.65rem] md:text-xs font-bold tracking-widest uppercase mb-2 stitch-box-overlay">
                {slide.badge}
              </div>
              <h2 class="text-[clamp(2.4rem,5vw,4rem)] font-extrabold leading-[1.05] tracking-tight mb-2 [text-shadow:0_2px_16px_rgba(0,0,0,0.5)]">
                {slide.title}
              </h2>
              <p class={`text-[clamp(1.1rem,1.8vw,1.35rem)] text-white/80 leading-relaxed mb-4 ${
                slide.align === "center" ? "max-w-[600px] mx-auto" : "max-w-[520px]"
              }`}>
                {slide.description}
              </p>
              {slide.cta && (
              <Link
                href={slide.cta.href}
                class="inline-flex items-center gap-2 py-2.5 px-6 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                {slide.cta.label}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
              )}
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
      <section id="products" class="px-0 bg-gray-200 dark:bg-neutral-900 p-px">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-px">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/collections/${cat.handle}/`}
              class="group relative overflow-hidden aspect-[4/3] md:aspect-[4/3] flex items-end"
            >
              <img
                src={cat.img}
                alt={cat.name}
                width={520}
                height={390}
                class="absolute inset-0 w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/15 transition-opacity duration-300 group-hover:opacity-70" />
              {/* Edge vignette — fades card edges into the page background, removed on hover */}
              <div class="absolute inset-0 shadow-[inset_0_0_50px_15px_rgba(0,0,0,0.25)] dark:shadow-[inset_0_0_50px_15px_rgba(0,0,0,0.4)] pointer-events-none transition-opacity duration-300 group-hover:opacity-0" />
              {/* Stitch border — all 4 sides, overlaid on top */}
              <div class="absolute inset-0 stitch-box-overlay pointer-events-none z-10 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.25))]" />
              {/* Corner tick marks — short registration-style dashes */}
              <svg class="absolute top-3 left-3 md:top-4 md:left-4 w-4 h-4 md:w-5 md:h-5 pointer-events-none z-10 overflow-visible" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <line x1="0" y1="1" x2="20" y2="1" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                <line x1="1" y1="0" x2="1" y2="20" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              </svg>
              <svg class="absolute top-3 right-3 md:top-4 md:right-4 w-4 h-4 md:w-5 md:h-5 pointer-events-none z-10 overflow-visible" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <line x1="0" y1="1" x2="20" y2="1" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                <line x1="19" y1="0" x2="19" y2="20" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              </svg>
              <svg class="absolute bottom-3 left-3 md:bottom-4 md:left-4 w-4 h-4 md:w-5 md:h-5 pointer-events-none z-10 overflow-visible" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <line x1="0" y1="19" x2="20" y2="19" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                <line x1="1" y1="0" x2="1" y2="20" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              </svg>
              <svg class="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 md:w-5 md:h-5 pointer-events-none z-10 overflow-visible" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <line x1="0" y1="19" x2="20" y2="19" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                <line x1="19" y1="0" x2="19" y2="20" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              </svg>
              <div class="relative z-10 text-left self-end w-full px-6 md:px-8 pb-5 md:pb-6">
                <div class="bg-black/30 backdrop-blur-[2px] rounded-md px-3 py-2 inline-block">
                <h3 class="text-white text-2xl font-bold">{cat.name}</h3>
                <p class="text-white/95 text-sm md:text-sm mt-0.5 line-clamp-1">{cat.desc}</p>
                </div>
                <span class="inline-flex items-center gap-1.5 mt-1.5 text-sm font-semibold text-primary max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                  Shop {cat.name}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Brands */}
      <div class="relative bg-white dark:bg-[#1e1e1e] py-12 md:py-16 px-4 md:px-8 text-center stitch-line-h stitch-line-h-bottom stitch-dark overflow-hidden">
        <div class="stitch-v-seams stitch-dark" />
        <div class="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cline x1='0' y1='16' x2='16' y2='0' stroke='%23000000' stroke-opacity='0.04' stroke-width='0.8' stroke-dasharray='1.2 1.8' stroke-linecap='round'/%3E%3C/svg%3E")` }} />
        <p class="relative text-sm md:text-base uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 font-bold mb-1">
          Trusted Brands We Carry
        </p>
        <p class="relative text-xs text-gray-400 dark:text-gray-500">Under construction</p>
      </div>

      {/* Value Props */}
      <section class="px-0 bg-gray-200 dark:bg-neutral-900 p-px">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-px">
          {([
            {
              img: "/footwear.jpg",
              objectPos: "center 80%",
              title: "CSA Certified Quality",
              desc: "Premium CSA footwear and workwear from trusted brands.",
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
              desc: "In-house embroidery and transfer services for your team.",
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
              desc: "Decades of apparel expertise with superior sourcing across Canada.",
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
            <div key={card.title} class="relative overflow-hidden py-6 md:py-8 px-6 md:px-8 flex items-center">
              <img
                src={card.img}
                alt=""
                width={600}
                height={400}
                style={'objectPos' in card && card.objectPos ? { objectPosition: card.objectPos } : undefined}
                class="absolute inset-0 w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-black/60" />
              <div class="absolute inset-0 shadow-[inset_0_0_50px_15px_rgba(0,0,0,0.25)] dark:shadow-[inset_0_0_50px_15px_rgba(0,0,0,0.4)] pointer-events-none" />
              {/* Stitch border — all 4 sides, overlaid on top */}
              <div class="absolute inset-0 stitch-box-overlay pointer-events-none z-10 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.25))]" />
              {/* Stitch corner brackets */}
              <svg class="absolute top-3 left-3 md:top-4 md:left-4 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <line x1="-6" y1="1" x2="40" y2="1" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                <line x1="1" y1="-6" x2="1" y2="40" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              </svg>
              <svg class="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-8 h-8 md:w-10 md:h-10 pointer-events-none z-10 overflow-visible" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <line x1="0" y1="39" x2="46" y2="39" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
                <line x1="39" y1="0" x2="39" y2="46" stroke="rgba(255,255,255,0.16)" stroke-width="0.8" stroke-dasharray="1.2 1.8" stroke-linecap="round" />
              </svg>
              <div class="relative z-10 flex items-center gap-5">
                <div class="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm text-primary flex items-center justify-center flex-shrink-0 border border-white/20">
                  {card.icon}
                </div>
                <div>
                  <h3 class="text-white text-lg font-bold tracking-tight">{card.title}</h3>
                  <p class="text-white/60 text-sm leading-relaxed mt-0.5">{card.desc}</p>
                </div>
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
