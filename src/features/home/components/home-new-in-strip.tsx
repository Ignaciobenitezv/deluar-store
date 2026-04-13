"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { CatalogProductCard } from "@/features/catalog/types";

type HomeNewInStripProps = {
  products: CatalogProductCard[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function HomeNewInStrip({ products }: HomeNewInStripProps) {
  const railRef = useRef<HTMLDivElement | null>(null);

  if (products.length === 0) {
    return null;
  }

  const scrollRail = (direction: "left" | "right") => {
    if (!railRef.current) return;

    railRef.current.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="space-y-4 lg:sticky lg:top-24">
        <div className="space-y-1.5">
          <p className="text-[0.62rem] uppercase tracking-[0.18em] text-muted/78">
            Seleccion
          </p>
          <h2 className="text-[1.05rem] font-semibold leading-tight tracking-tight text-foreground">
            Lo nuevo en Deluar
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/productos"
            className="text-[0.64rem] uppercase tracking-[0.16em] text-foreground/78 transition-colors hover:text-foreground"
          >
            Ver todos
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Productos anteriores"
              onClick={() => scrollRail("left")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8d2ca] bg-white text-foreground/72 transition-colors duration-200 hover:border-[#c6bbae] hover:bg-[#f7f5f1] hover:text-foreground"
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
              aria-label="Productos siguientes"
              onClick={() => scrollRail("right")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8d2ca] bg-white text-foreground/72 transition-colors duration-200 hover:border-[#c6bbae] hover:bg-[#f7f5f1] hover:text-foreground"
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
      </div>

      <div
        ref={railRef}
        className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-max gap-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={product.productHref}
              className="group flex w-[16.2rem] shrink-0 items-center gap-3 rounded-[0.45rem] border border-[#e9e3db] bg-white p-2.5 transition-colors duration-200 hover:border-[#d7cec2]"
            >
              <div className="relative h-[5.6rem] w-[4.6rem] shrink-0 overflow-hidden rounded-[0.3rem] bg-[#efe6da]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.imageAlt}
                    fill
                    sizes="74px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#f5efe7_0%,#e8ddd1_100%)]" />
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <p className="text-[0.54rem] uppercase tracking-[0.16em] text-muted/72">
                  {product.categoryTitle}
                </p>
                <h3 className="line-clamp-2 text-[0.76rem] font-medium leading-tight text-foreground">
                  {product.title}
                </h3>
                <p className="text-[0.8rem] font-semibold leading-none text-foreground">
                  {formatPrice(product.basePrice)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
