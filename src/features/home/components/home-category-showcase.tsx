"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { HomeCategoryShowcaseItem } from "@/features/home/types";

type HomeCategoryShowcaseProps = {
  categories: HomeCategoryShowcaseItem[];
};

const DESKTOP_BATCH_SIZE = 8;

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
  style,
}: {
  product: HomeCategoryShowcaseItem["products"][number];
  sizes: string;
  compact?: boolean;
  style?: CSSProperties;
}) {
  return (
    <Link
      href={product.productHref}
      style={style}
      className={cn(
        "group rounded-[1.1rem] border border-black/6 bg-white/78 p-2.5 transition-all duration-300 hover:border-black/10 hover:bg-white/84 hover:translate-y-[-1px]",
        compact
          ? "rounded-[1rem] p-2.5"
          : "lg:rounded-[1.2rem] lg:border-white/30 lg:bg-white/40 lg:p-2.5 lg:shadow-[0_18px_40px_rgba(33,24,18,0.08)] lg:backdrop-blur-md lg:hover:border-white/40 lg:hover:bg-white/48",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-[#efe5d8]",
          compact
            ? "aspect-[1/1.02] rounded-[0.85rem]"
            : "aspect-[1/1.03] rounded-[0.95rem] lg:aspect-[1.08/1]",
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
        <div className={cn("flex", compact ? "pt-0.5 justify-start" : "justify-end pt-1")}>
          <span
            className={cn(
              "inline-flex items-center text-[0.68rem] font-medium uppercase tracking-[0.14em] transition-colors",
              compact
                ? "text-foreground/72 group-hover:text-foreground"
                : "text-[var(--color-accent-strong)] group-hover:text-[#7a5848]",
            )}
          >
            Ver producto
          </span>
        </div>
      </div>
    </Link>
  );
}

export function HomeCategoryShowcase({ categories }: HomeCategoryShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDesktopProducts, setShowDesktopProducts] = useState(false);
  const [desktopMinHeight, setDesktopMinHeight] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const seenCategoryIdsRef = useRef(new Set<string>(categories[0] ? [categories[0].id] : []));
  const batchIndexByCategoryRef = useRef<Record<string, number>>({});

  const moveToCategory = (nextIndex: number) => {
    setActiveIndex((current) => {
      if (nextIndex === current) {
        return current;
      }

      const nextCategory = categories[nextIndex];
      const seenCategoryIds = seenCategoryIdsRef.current;
      const batchIndexByCategory = batchIndexByCategoryRef.current;

      if (seenCategoryIds.has(nextCategory.id)) {
        const totalBatches = Math.max(nextCategory.products.length - DESKTOP_BATCH_SIZE + 1, 1);
        batchIndexByCategory[nextCategory.id] =
          ((batchIndexByCategory[nextCategory.id] ?? 0) + 1) % totalBatches;
      } else {
        seenCategoryIds.add(nextCategory.id);
        batchIndexByCategory[nextCategory.id] = 0;
      }

      return nextIndex;
    });
  };

  useEffect(() => {
    if (categories.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = (current + 1) % categories.length;
        const nextCategory = categories[nextIndex];
        const seenCategoryIds = seenCategoryIdsRef.current;
        const batchIndexByCategory = batchIndexByCategoryRef.current;

        if (seenCategoryIds.has(nextCategory.id)) {
          const totalBatches = Math.max(nextCategory.products.length - DESKTOP_BATCH_SIZE + 1, 1);
          batchIndexByCategory[nextCategory.id] =
            ((batchIndexByCategory[nextCategory.id] ?? 0) + 1) % totalBatches;
        } else {
          seenCategoryIds.add(nextCategory.id);
          batchIndexByCategory[nextCategory.id] = 0;
        }

        return nextIndex;
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [categories.length]);

  useEffect(() => {
    setShowDesktopProducts(false);

    const timer = window.setTimeout(() => {
      setShowDesktopProducts(true);
    }, 360);

    return () => window.clearTimeout(timer);
  }, [activeIndex]);

  useEffect(() => {
    const updateDesktopMinHeight = () => {
      if (!sectionRef.current || window.innerWidth < 1024) {
        setDesktopMinHeight(null);
        return;
      }

      const rect = sectionRef.current.getBoundingClientRect();
      const availableHeight = Math.max(window.innerHeight - rect.top - 12, 0);
      setDesktopMinHeight(availableHeight);
    };

    updateDesktopMinHeight();
    window.addEventListener("resize", updateDesktopMinHeight);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateDesktopMinHeight())
        : null;

    if (resizeObserver && sectionRef.current) {
      resizeObserver.observe(sectionRef.current);
      const parentElement = sectionRef.current.parentElement;
      if (parentElement) {
        resizeObserver.observe(parentElement);
      }
    }

    return () => {
      window.removeEventListener("resize", updateDesktopMinHeight);
      resizeObserver?.disconnect();
    };
  }, []);

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
  const activeBatchIndex = batchIndexByCategoryRef.current[activeCategory.id] ?? 0;
  const activeCategoryProducts = useMemo(() => {
    const batchSize = DESKTOP_BATCH_SIZE;
    const products = activeCategory.products;

    if (products.length <= batchSize) {
      return products;
    }

    const maxStart = products.length - batchSize;
    const start = Math.min(activeBatchIndex, maxStart);

    return products.slice(start, start + batchSize);
  }, [activeBatchIndex, activeCategory]);
  const mobileProducts = activeCategoryProducts.slice(0, 2);

  return (
    <section ref={sectionRef} className="px-6 pb-2 sm:px-8 lg:pl-0 lg:pr-4 xl:pl-1 xl:pr-5 2xl:pl-2 2xl:pr-6">
      <div className="mx-auto w-full max-w-[128rem] space-y-4 lg:space-y-5">
        <div className="hidden lg:block">
          <div
            key={activeCategory.id}
            style={desktopMinHeight ? { minHeight: `${desktopMinHeight}px` } : undefined}
            className="grid min-h-[34rem] grid-cols-[minmax(26rem,0.43fr)_minmax(0,0.57fr)] gap-3 animate-[fade-up_700ms_cubic-bezier(0.16,1,0.3,1)] xl:min-h-[36rem] xl:gap-4 2xl:grid-cols-[minmax(28rem,0.45fr)_minmax(0,0.55fr)]"
          >
            <div className="relative overflow-hidden rounded-[2.15rem] bg-[linear-gradient(180deg,rgba(255,251,246,0.28),rgba(244,237,228,0.16))] shadow-[0_18px_48px_rgba(58,40,26,0.07)]">
              {activeCategory.imageUrl ? (
                <Image
                  src={activeCategory.imageUrl}
                  alt={activeCategory.imageAlt}
                  fill
                  sizes="(min-width: 1536px) 34vw, (min-width: 1024px) 38vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(235,223,206,0.98),rgba(201,181,160,0.92))]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,13,10,0.16)_0%,rgba(18,13,10,0.34)_36%,rgba(18,13,10,0.58)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,248,240,0.18),transparent_32%)]" />
              <div className="relative flex h-full items-end p-6 xl:p-8 2xl:p-10">
                <div className="max-w-[24rem] space-y-4 text-white 2xl:max-w-[26rem]">
                  <p className="text-[0.7rem] uppercase tracking-[0.3em] text-white/76">
                    Categoria
                  </p>
                  <h2 className="text-[3.1rem] font-semibold leading-[0.94] tracking-[0.02em] xl:text-[3.5rem] 2xl:text-[3.85rem]">
                    {activeCategory.title}
                  </h2>
                  <p className="max-w-[22rem] text-[1.02rem] leading-7 text-white/84 2xl:max-w-[24rem] 2xl:text-[1.06rem]">
                    {activeCategory.description ||
                      "Explora una seleccion curada de piezas para sumar textura, calma y funcion al ambiente."}
                  </p>
                  <Link
                    href={activeCategory.href}
                    className="inline-flex min-h-[3.25rem] items-center justify-center rounded-full border border-[#f4e7d8]/42 bg-[#ead6bf] px-6 text-[0.78rem] font-medium uppercase tracking-[0.14em] text-[#2b1f17] shadow-[0_10px_24px_rgba(24,18,14,0.12)] transition-all duration-300 hover:bg-[#e1c6a6] hover:translate-y-[-1px] xl:min-h-[3.4rem] xl:px-7"
                  >
                    Ver categoria
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 py-1 pl-1 pr-0 xl:gap-3.5 2xl:gap-4">
              {activeCategoryProducts.map((product, index) => (
                <ProductMiniCard
                  key={product.id}
                  product={product}
                  sizes="(min-width: 1536px) 11vw, (min-width: 1280px) 12vw, (min-width: 1024px) 14vw, 50vw"
                  style={
                    showDesktopProducts
                      ? {
                          animation:
                            "fade-up 520ms cubic-bezier(0.16,1,0.3,1) both",
                          animationDelay: `${index * 90}ms`,
                        }
                      : { opacity: 0, transform: "translateY(10px)" }
                  }
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
              onClick={() => moveToCategory(index)}
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
