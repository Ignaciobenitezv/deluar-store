"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { SiteContainer } from "@/components/layout/site-container";
import type { HomeCategoryRailItem } from "@/features/home/types";

type HomeCategoryRailProps = {
  categories: HomeCategoryRailItem[];
};

export function HomeCategoryRail({ categories }: HomeCategoryRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);

  if (categories.length === 0) {
    return null;
  }

  const scrollRail = (direction: "left" | "right") => {
    if (!railRef.current) {
      return;
    }

    railRef.current.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <section className="w-full bg-white py-6 sm:py-8">
      <SiteContainer className="space-y-3.5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[1.35rem] sm:text-[1.55rem] font-bold tracking-tight text-foreground">
  Categorías
</h2>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Categorias anteriores"
              onClick={() => scrollRail("left")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d2ca] bg-white text-foreground/70 transition-colors duration-200 hover:border-[#c6bbae] hover:bg-[#f7f5f1] hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.5 3.5 5 8l4.5 4.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Categorias siguientes"
              onClick={() => scrollRail("right")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d2ca] bg-white text-foreground/70 transition-colors duration-200 hover:border-[#c6bbae] hover:bg-[#f7f5f1] hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6.5 3.5 11 8l-4.5 4.5" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={railRef}
          className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-max flex-nowrap gap-3 sm:gap-3.5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="group flex w-[8.75rem] shrink-0 flex-col bg-white transition-transform duration-200 hover:-translate-y-px sm:w-[9.25rem] lg:w-[9.5rem] xl:w-[9.75rem]"
              >
                <div className="relative aspect-[1/0.78] overflow-hidden rounded-t-[0.3rem] bg-[#f4efe8]">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 156px, (min-width: 1024px) 152px, (min-width: 640px) 148px, 140px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,#f5efe7_0%,#e8ddd1_100%)]" />
                  )}
                </div>

                <div className="-mt-px flex h-[2.45rem] items-center justify-center rounded-b-[0.35rem] border border-[#ebe6de] px-2 text-center">
                  <h3 className="line-clamp-1 w-full overflow-hidden text-ellipsis whitespace-nowrap text-[0.75rem] font-normal tracking-[0.01em] text-foreground/72">
                    {category.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
