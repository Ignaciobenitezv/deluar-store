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
          imageAlt: "DELUAR",
          ctaLabel: "Ver productos",
          ctaHref: "/productos",
        },
      ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (safeSlides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeSlides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [safeSlides.length]);

  return (
    <section className="relative flex min-h-[calc(100svh-10rem)] flex-col overflow-hidden border-b border-border/70 bg-[#e9dece] sm:min-h-[calc(100svh-10.5rem)] lg:min-h-[calc(100svh-12rem)]">
      <div className="absolute inset-0">
        {safeSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt={slide.imageAlt}
                fill
                priority={index === 0}
                sizes="100vw"
                className={cn(
                  "object-cover transition-transform duration-[7000ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                  index === activeIndex ? "scale-[1.045]" : "scale-100",
                )}
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,253,249,0.95),rgba(220,204,186,0.92))]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,16,12,0.72)_0%,rgba(22,16,12,0.44)_38%,rgba(22,16,12,0.18)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,252,248,0.10),transparent_34%),linear-gradient(180deg,rgba(255,250,244,0.03)_0%,rgba(20,14,10,0.28)_100%)]" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="mx-auto flex w-full max-w-[1200px] items-center">
          <div className="flex w-full items-center justify-start lg:grid lg:grid-cols-[1fr_220px] lg:gap-8 lg:items-center lg:justify-between">
            <div className="mx-auto w-full max-w-[17.5rem] min-h-[14.5rem] rounded-[1.5rem] border border-white/16 bg-[rgba(29,21,16,0.30)] px-4 py-4 text-white shadow-[0_18px_44px_rgba(14,10,7,0.18)] backdrop-blur-[8px] sm:max-w-[24rem] sm:min-h-[18rem] sm:px-6 sm:py-6 lg:mx-0 lg:min-h-[24rem] lg:max-w-[40rem] lg:rounded-[2rem] lg:px-10 lg:py-10">
              <div className="space-y-4 animate-[fade-up_900ms_cubic-bezier(0.16,1,0.3,1)] sm:space-y-5 lg:space-y-6">
                <p className="text-xs uppercase tracking-[0.34em] text-white/74">
                  {safeSlides[activeIndex]?.eyebrow}
                </p>
                <h1 className="min-h-[3.9rem] max-w-[15rem] text-[1.9rem] font-semibold leading-[0.98] tracking-[0.01em] sm:min-h-[5.3rem] sm:max-w-[22rem] sm:text-[2.7rem] sm:leading-[0.99] lg:min-h-[7.75rem] lg:max-w-[38rem] lg:text-[4.25rem] lg:leading-[0.98]">
                  {safeSlides[activeIndex]?.title}
                </h1>
                <p className="min-h-[2.5rem] max-w-[15rem] text-[0.82rem] leading-5 text-white/82 sm:min-h-[3.25rem] sm:max-w-[22rem] sm:text-[0.95rem] sm:leading-6 lg:min-h-[4.5rem] lg:max-w-[30rem] lg:text-[1rem] lg:leading-7">
                  {safeSlides[activeIndex]?.text}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-3">
                  <Link
                    href={safeSlides[activeIndex]?.ctaHref || "/productos"}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d8b998]/45 bg-[#cfab84] px-5 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[#2f2117] shadow-[0_16px_34px_rgba(17,12,9,0.18)] transition-all duration-500 hover:bg-[#c49a72] hover:translate-y-[-1px] sm:min-h-12 sm:px-6 sm:text-[0.78rem] lg:min-h-[3.4rem] lg:px-7 lg:text-[0.92rem] lg:tracking-[0.12em]"
                  >
                    {safeSlides[activeIndex]?.ctaLabel || "Ver producto"}
                  </Link>
                  {safeSlides.length > 1 ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-[rgba(255,255,255,0.08)] px-3 py-2 backdrop-blur-[4px]">
                      {safeSlides.map((slide, index) => (
                        <button
                          key={slide.id}
                          type="button"
                          aria-label={`Ir al slide ${index + 1}`}
                          onClick={() => setActiveIndex(index)}
                          className={cn(
                            "h-2.5 w-2.5 rounded-full transition-all duration-500",
                            index === activeIndex
                              ? "scale-110 bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.12)]"
                              : "bg-white/32 hover:bg-white/58",
                          )}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {safeSlides.length > 1 ? (
              <div className="hidden lg:block">
                <div className="rounded-[1.8rem] border border-white/14 bg-[rgba(24,18,13,0.22)] p-3 backdrop-blur-[6px]">
                  <div className="grid gap-3">
                    {safeSlides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                          "group relative h-24 w-44 overflow-hidden rounded-[1.2rem] border text-left transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          index === activeIndex
                            ? "border-white/52 bg-white/6 shadow-[0_18px_40px_rgba(10,8,6,0.18)]"
                            : "border-white/14 hover:border-white/28",
                        )}
                      >
                        {slide.imageUrl ? (
                          <Image
                            src={slide.imageUrl}
                            alt={slide.imageAlt}
                            fill
                            sizes="176px"
                            className={cn(
                              "object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                              index === activeIndex ? "scale-[1.04]" : "scale-100",
                            )}
                          />
                        ) : (
                          <div className="h-full w-full bg-[linear-gradient(180deg,rgba(255,251,245,0.45),rgba(156,128,106,0.45))]" />
                        )}
                        <div
                          className={cn(
                            "absolute inset-0 transition-all duration-700",
                            index === activeIndex
                              ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(23,16,11,0.68))]"
                              : "bg-[linear-gradient(180deg,transparent,rgba(23,16,11,0.78))]",
                          )}
                        />
                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <p
                            className={cn(
                              "line-clamp-2 text-xs uppercase tracking-[0.2em] transition-colors duration-500",
                              index === activeIndex ? "text-white" : "text-white/82",
                            )}
                          >
                            {slide.eyebrow}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-auto w-full">
        <HomeBenefitsMarquee />
      </div>
    </section>
  );
}
