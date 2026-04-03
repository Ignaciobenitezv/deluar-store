"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
    <section className="relative min-h-[72vh] overflow-hidden border-b border-border/70 bg-[#e9dece]">
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

      <div className="relative flex min-h-[72vh] w-full items-end px-0 py-10 sm:py-12 lg:py-14">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="ml-10 max-w-[58rem] rounded-[2.35rem] border border-white/16 bg-[rgba(29,21,16,0.30)] px-8 py-10 text-white shadow-[0_26px_68px_rgba(14,10,7,0.18)] backdrop-blur-[8px] sm:ml-12 sm:px-11 sm:py-12 lg:ml-20 lg:px-14 lg:py-14 xl:ml-24">
            <div
              key={safeSlides[activeIndex]?.id}
              className="space-y-7 animate-[fade-up_900ms_cubic-bezier(0.16,1,0.3,1)]"
            >
              <p className="text-xs uppercase tracking-[0.34em] text-white/74">
                {safeSlides[activeIndex]?.eyebrow}
              </p>
              <h1 className="max-w-[46rem] text-5xl font-semibold tracking-[0.015em] sm:text-[3.9rem] sm:leading-[1.02] lg:text-[5.5rem] lg:leading-[0.97]">
                {safeSlides[activeIndex]?.title}
              </h1>
              <p className="max-w-[38rem] text-base leading-8 text-white/82 sm:text-[1.07rem]">
                {safeSlides[activeIndex]?.text}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Link
                  href={safeSlides[activeIndex]?.ctaHref || "/productos"}
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-7 text-sm uppercase tracking-[0.22em] text-[#3b2a1f] shadow-[0_14px_32px_rgba(255,255,255,0.08)] transition-all duration-500 hover:bg-[rgba(255,255,255,0.92)] hover:translate-y-[-1px]"
                >
                  {safeSlides[activeIndex]?.ctaLabel}
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
            <div className="hidden justify-self-end self-end lg:mr-12 lg:block xl:mr-16">
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
    </section>
  );
}
