"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeBenefitsMarquee } from "@/features/home/components/home-benefits-marquee";
import { cn } from "@/lib/utils";
import type { HomeHeroSlide } from "@/features/home/types";

type HomeHeroSliderProps = {
  slides: HomeHeroSlide[];
};

export function HomeHeroSlider({ slides }: HomeHeroSliderProps) {
  const safeSlides = slides.length
    ? slides
    : [
        {
          id: "fallback",
          eyebrow: "DELUAR",
          title: "Textiles y objetos para una casa con calma.",
          text: "Carga contenido en Sanity para completar el hero principal de la portada.",
          imageUrl: null,
          mobileImageUrl: null,
          imageAlt: "DELUAR",
          ctaLabel: "Ver productos",
          ctaHref: "/productos",
          secondaryCtaLabel: undefined,
          secondaryCtaHref: undefined,
        },
      ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (safeSlides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeSlides.length);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [safeSlides.length]);

  return (
    <section className="relative flex min-h-[36rem] flex-col overflow-hidden border-b border-border/70 bg-[#e9dece] sm:min-h-[42rem] lg:grid lg:h-[calc(100svh-11.5rem)] lg:min-h-[calc(100svh-11.5rem)] lg:grid-rows-[minmax(0,1fr)_auto]">
      <div className="absolute inset-0">
        {safeSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <div className="sm:hidden">
              {slide.mobileImageUrl || slide.imageUrl ? (
                <Image
                  src={slide.mobileImageUrl || slide.imageUrl || ""}
                  alt={slide.imageAlt}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className={cn(
                    "object-cover transition-transform duration-[7000ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    index === activeIndex ? "scale-[1.035]" : "scale-100",
                  )}
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,253,249,0.95),rgba(220,204,186,0.92))]" />
              )}
            </div>
            <div className="hidden sm:block">
              {slide.imageUrl ? (
                <Image
                  src={slide.imageUrl}
                  alt={slide.imageAlt}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className={cn(
                    "object-cover transition-transform duration-[7000ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    index === activeIndex ? "scale-[1.035]" : "scale-100",
                  )}
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,253,249,0.95),rgba(220,204,186,0.92))]" />
              )}
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,16,12,0.54)_0%,rgba(22,16,12,0.24)_40%,rgba(22,16,12,0.12)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,251,246,0.02)_0%,rgba(18,13,10,0.24)_100%)]" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-1 items-end px-5 py-8 sm:px-8 sm:py-10 lg:min-h-0 lg:px-10 lg:py-7 xl:py-8">
        <div className="flex w-full max-w-[88rem] pl-12 sm:pl-16 lg:pl-24 xl:pl-32">
          <div className="w-full">
            <div className="max-w-[21rem] space-y-5 text-white sm:max-w-[31rem] lg:max-w-[40rem] xl:max-w-[44rem]">
              <p className="text-[0.74rem] uppercase tracking-[0.34em] text-white/78 sm:text-[0.8rem] lg:text-[0.82rem]">
                {safeSlides[activeIndex]?.eyebrow}
              </p>
              <div
                key={safeSlides[activeIndex]?.id}
                className="space-y-5 animate-[fade-up_700ms_cubic-bezier(0.16,1,0.3,1)] sm:space-y-6 lg:space-y-7"
              >
                <h1 className="text-[2.8rem] font-semibold leading-[0.92] tracking-[0.015em] sm:text-[4rem] lg:text-[5.6rem] xl:text-[6.2rem]">
                  {safeSlides[activeIndex]?.title}
                </h1>
                <p className="max-w-[34rem] text-[1rem] leading-7 text-white/86 sm:text-[1.08rem] sm:leading-8 lg:text-[1.18rem] lg:leading-8">
                  {safeSlides[activeIndex]?.text}
                </p>
                <div className="flex flex-wrap items-center gap-3.5 pt-2 sm:gap-4 sm:pt-3">
                  <Link
                    href={safeSlides[activeIndex]?.ctaHref || "/productos"}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f1dcc7] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#35261d] shadow-[0_14px_28px_rgba(18,13,10,0.18)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#ead0b3] sm:min-h-[3.35rem] sm:px-7 lg:min-h-[3.6rem] lg:px-8 lg:text-[0.8rem]"
                  >
                    {safeSlides[activeIndex]?.ctaLabel || "Ver producto"}
                  </Link>
                  {safeSlides[activeIndex]?.secondaryCtaLabel && safeSlides[activeIndex]?.secondaryCtaHref ? (
                    <Link
                      href={safeSlides[activeIndex].secondaryCtaHref}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/28 bg-white/10 px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-[4px] transition-all duration-300 hover:bg-white/16 sm:min-h-[3.35rem] sm:px-7 lg:min-h-[3.6rem] lg:px-8 lg:text-[0.8rem]"
                    >
                      {safeSlides[activeIndex].secondaryCtaLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {safeSlides.length > 1 ? (
              <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-7">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Slide anterior"
                    onClick={() => setActiveIndex((current) => (current - 1 + safeSlides.length) % safeSlides.length)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/22 bg-white/10 text-white backdrop-blur-[4px] transition-all duration-300 hover:bg-white/16"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Slide siguiente"
                    onClick={() => setActiveIndex((current) => (current + 1) % safeSlides.length)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/22 bg-white/10 text-white backdrop-blur-[4px] transition-all duration-300 hover:bg-white/16"
                  >
                    ›
                  </button>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-[rgba(255,255,255,0.08)] px-3 py-2 backdrop-blur-[4px]">
                  {safeSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      aria-label={`Ir al slide ${index + 1}`}
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "h-2.5 rounded-full transition-all duration-300",
                        index === activeIndex ? "w-7 bg-white" : "w-2.5 bg-white/35 hover:bg-white/58",
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full">
        <HomeBenefitsMarquee />
      </div>
    </section>
  );
}
