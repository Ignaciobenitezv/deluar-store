"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { HomeCategoryShowcaseItem } from "@/features/home/types";

type HomeCategoryShowcaseProps = {
  categories: HomeCategoryShowcaseItem[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function ProductMiniCard({
  product,
  sizes,
  compact = false,
}: {
  product: HomeCategoryShowcaseItem["products"][number];
  sizes: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={product.productHref}
      className={cn(
        "group rounded-[1.1rem] border border-black/6 bg-white/78 p-2.5 transition-all duration-300 hover:border-black/10 hover:bg-white/84 hover:translate-y-[-1px]",
        compact ? "rounded-[1rem] p-2.5" : "lg:rounded-[1.05rem] lg:border-black/5 lg:p-2.5",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-[#efe5d8]",
          compact ? "aspect-[1/1.02] rounded-[0.85rem]" : "aspect-[1/1.03] rounded-[0.95rem]",
        )}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-[0.7rem] uppercase tracking-[0.2em] text-muted">
            Sin imagen
          </div>
        )}
      </div>
      <div className={cn("space-y-1 px-0.5", compact ? "pt-2.5" : "pt-3")}>
        <h3
          className={cn(
            "line-clamp-2 font-medium tracking-[0.018em] text-foreground",
            compact ? "text-[0.82rem] leading-5" : "text-[0.9rem] leading-5 lg:text-[0.95rem]",
          )}
        >
          {product.title}
        </h3>
        <p className={cn("text-foreground/86", compact ? "text-[0.82rem]" : "text-[0.88rem]")}>
          {formatPrice(product.basePrice)}
        </p>
      </div>
    </Link>
  );
}

export function HomeCategoryShowcase({ categories }: HomeCategoryShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (categories.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % categories.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [categories.length]);

  if (categories.length === 0) {
    return (
      <div className="px-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="rounded-[1.8rem] border border-border/80 bg-surface/92 px-6 py-8 text-sm leading-7 text-muted">
          Todavia no hay categorias cargadas para destacar en la portada.
        </div>
      </div>
    );
  }

  const activeCategory = categories[activeIndex];
  const mobileProducts = activeCategory.products.slice(0, 2);

  return (
    <section className="px-6 pb-2 sm:px-8 lg:px-12 xl:px-16">
      <div className="mx-auto w-full max-w-[112rem] space-y-4 lg:space-y-5">
        <div className="hidden overflow-hidden rounded-[2rem] border border-black/6 bg-[linear-gradient(180deg,rgba(255,251,246,0.94),rgba(244,237,228,0.76))] lg:block">
          <div
            key={activeCategory.id}
            className="grid min-h-[35rem] grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] gap-0 animate-[fade-up_700ms_cubic-bezier(0.16,1,0.3,1)]"
          >
            <div className="relative overflow-hidden">
              {activeCategory.imageUrl ? (
                <Image
                  src={activeCategory.imageUrl}
                  alt={activeCategory.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(235,223,206,0.98),rgba(201,181,160,0.92))]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,13,10,0.16)_0%,rgba(18,13,10,0.34)_36%,rgba(18,13,10,0.58)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,248,240,0.18),transparent_32%)]" />
              <div className="relative flex h-full items-end p-7 xl:p-9">
                <div className="max-w-[24rem] space-y-4 text-white">
                  <p className="text-[0.68rem] uppercase tracking-[0.28em] text-white/76">
                    Categoria
                  </p>
                  <h2 className="text-[2.85rem] font-semibold leading-[0.95] tracking-[0.02em] xl:text-[3.15rem]">
                    {activeCategory.title}
                  </h2>
                  <p className="max-w-[21rem] text-[0.98rem] leading-7 text-white/84">
                    {activeCategory.description ||
                      "Explora una seleccion curada de piezas para sumar textura, calma y funcion al ambiente."}
                  </p>
                  <Link
                    href={activeCategory.href}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#f4e7d8]/42 bg-[#ead6bf] px-6 text-[0.76rem] font-medium uppercase tracking-[0.14em] text-[#2b1f17] shadow-[0_10px_24px_rgba(24,18,14,0.12)] transition-all duration-300 hover:bg-[#e1c6a6] hover:translate-y-[-1px]"
                  >
                    Ver categoria
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-5 xl:gap-3 xl:p-6">
              {activeCategory.products.map((product) => (
                <ProductMiniCard
                  key={product.id}
                  product={product}
                  sizes="(min-width: 1280px) 19vw, (min-width: 1024px) 24vw, 50vw"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.7rem] border border-black/6 bg-[linear-gradient(180deg,rgba(255,251,246,0.9),rgba(244,237,228,0.76))] lg:hidden">
          <div
            key={`${activeCategory.id}-mobile`}
            className="animate-[fade-up_700ms_cubic-bezier(0.16,1,0.3,1)]"
          >
            <div className="relative min-h-[17.25rem] overflow-hidden">
              {activeCategory.imageUrl ? (
                <Image
                  src={activeCategory.imageUrl}
                  alt={activeCategory.imageAlt}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(235,223,206,0.98),rgba(201,181,160,0.92))]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,13,10,0.12)_0%,rgba(18,13,10,0.3)_44%,rgba(18,13,10,0.56)_100%)]" />
              <div className="relative flex min-h-[17.25rem] items-end p-4 sm:p-5">
                <div className="max-w-[15rem] space-y-3 text-white">
                  <p className="text-[0.66rem] uppercase tracking-[0.24em] text-white/72">
                    Categoria
                  </p>
                  <h2 className="text-[2.08rem] font-semibold leading-[0.96] tracking-[0.02em]">
                    {activeCategory.title}
                  </h2>
                  <Link
                    href={activeCategory.href}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#f4e7d8]/35 bg-[#ead6bf] px-5 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[#302219]"
                  >
                    Ver categoria
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 bg-[linear-gradient(180deg,rgba(255,251,246,0.18),rgba(244,237,228,0.64))] p-3.5 sm:gap-3 sm:p-4">
              {mobileProducts.map((product) => (
                <ProductMiniCard key={product.id} product={product} sizes="50vw" compact />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pb-2">
          {categories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              aria-label={`Ver categoria ${category.title}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === activeIndex
                  ? "w-6 bg-[var(--color-accent-strong)]"
                  : "w-2 bg-border/80 hover:bg-border",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
