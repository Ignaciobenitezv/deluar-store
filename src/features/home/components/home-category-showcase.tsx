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

function getInstallmentPrice(value: number) {
  return formatPrice(Math.round(value / 3));
}

function formatAttributeLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ProductMiniCard({
  product,
  sizes,
  compact = false,
  style,
  className,
  imageClassName,
  badgeLabel,
}: {
  product: HomeCategoryShowcaseItem["products"][number];
  sizes: string;
  compact?: boolean;
  style?: CSSProperties;
  className?: string;
  imageClassName?: string;
  badgeLabel?: string;
}) {
  const detailAttribute = product.subcategorySlug
    ? formatAttributeLabel(product.subcategorySlug)
    : product.categoryTitle;

  return (
    <Link
      href={product.productHref}
      style={style}
      className={cn(
        "group flex h-full flex-col rounded-[1.1rem] border border-[#d8c3ae]/70 bg-[linear-gradient(180deg,rgba(252,247,241,0.96),rgba(245,236,227,0.94))] p-2.5 shadow-[0_10px_24px_rgba(73,52,39,0.06)] transition-all duration-300 hover:border-[#cfb59d] hover:translate-y-[-2px] hover:shadow-[0_16px_30px_rgba(73,52,39,0.1)]",
        compact
          ? "rounded-[1rem] p-2.5"
          : "lg:relative lg:isolate lg:overflow-hidden lg:rounded-[1.2rem] lg:border-[#d4bda7]/72 lg:bg-[linear-gradient(180deg,rgba(252,247,241,0.98),rgba(244,234,224,0.95))] lg:p-2.5 lg:shadow-[0_12px_28px_rgba(73,52,39,0.07),inset_0_1px_0_rgba(255,251,246,0.55)] lg:before:pointer-events-none lg:before:absolute lg:before:inset-0 lg:before:bg-[linear-gradient(180deg,rgba(255,252,248,0.42),rgba(255,252,248,0.08)_40%,transparent_100%)] lg:before:content-[''] lg:hover:border-[#c8ab90] lg:hover:bg-[linear-gradient(180deg,rgba(253,248,242,1),rgba(245,236,227,0.98))] lg:hover:shadow-[0_18px_34px_rgba(73,52,39,0.11),inset_0_1px_0_rgba(255,251,246,0.62)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-[#efe5d8]",
          compact
            ? "aspect-[1/1.02] rounded-[0.85rem]"
            : "aspect-[1/1.03] rounded-[0.95rem] lg:z-10 lg:aspect-[1.08/1]",
          imageClassName,
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
        {badgeLabel ? (
          <span className="absolute left-2.5 top-2.5 z-20 inline-flex min-h-7 items-center rounded-full bg-[#f5e2ca] px-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#6f4d3a] shadow-[0_8px_18px_rgba(84,58,42,0.12)]">
            {badgeLabel}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col px-0.5",
          compact ? "pt-2.5" : "pt-3 lg:relative lg:z-10",
        )}
      >
        {!compact ? (
          <p className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#8d6d5c]">
            {detailAttribute}
          </p>
        ) : null}
        <h3
          className={cn(
            "line-clamp-2 font-medium tracking-[0.018em] text-[#2f2219]",
            compact ? "text-[0.82rem] leading-5" : "text-[0.96rem] leading-[1.35] lg:text-[1rem]",
          )}
        >
          {product.title}
        </h3>
        {product.shortDescription ? (
          <p
            className={cn(
              "text-[#746154]",
              compact
                ? "mt-1.5 line-clamp-2 text-[0.73rem] leading-4"
                : "mt-2 line-clamp-2 text-[0.8rem] leading-[1.45]",
            )}
          >
            {product.shortDescription}
          </p>
        ) : null}
        <div className={cn(compact ? "mt-2 space-y-0.5" : "mt-3 space-y-0.5")}>
          <p
            className={cn(
              "text-[#4a3327]",
              compact ? "text-[0.9rem] font-semibold" : "text-[1.12rem] font-semibold tracking-[0.01em]",
            )}
          >
            {formatPrice(product.basePrice)}
          </p>
          <p
            className={cn(
              "text-[#8a6a58]",
              compact ? "text-[0.72rem]" : "text-[0.78rem] font-medium",
            )}
          >
            3 cuotas de {getInstallmentPrice(product.basePrice)}
          </p>
        </div>
        <div className={cn("mt-auto flex", compact ? "justify-start pt-2" : "justify-start pt-3")}>
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full border transition-all duration-300",
              compact
                ? "min-h-8 border-[#d8b99f] bg-[#f3e2cf] px-3 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#67493a] group-hover:border-[#cda98b] group-hover:bg-[#eed7bf]"
                : "min-h-9 border-[#d7b79d] bg-[#f4dfcb] px-3.5 text-[0.67rem] font-semibold uppercase tracking-[0.15em] text-[#644637] shadow-[0_6px_14px_rgba(84,58,42,0.08)] group-hover:border-[#caa689] group-hover:bg-[#efd5bb] group-hover:shadow-[0_10px_18px_rgba(84,58,42,0.12)]",
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
  const seenCategoryIdsRef = useRef(new Set<string>());
  const batchIndexByCategoryRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (categories.length === 0) return;

    if (!seenCategoryIdsRef.current.size) {
      seenCategoryIdsRef.current = new Set([categories[0].id]);
    }

    setActiveIndex((current) => {
      if (current >= categories.length) return 0;
      return current;
    });
  }, [categories]);

  const moveToCategory = (nextIndex: number) => {
    setActiveIndex((current) => {
      if (nextIndex === current) return current;

      const nextCategory = categories[nextIndex];
      if (!nextCategory) return current;

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
    if (categories.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = (current + 1) % categories.length;
        const nextCategory = categories[nextIndex];
        if (!nextCategory) return current;

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
  }, [categories]);

  useEffect(() => {
    setShowDesktopProducts(false);
    const timer = window.setTimeout(() => setShowDesktopProducts(true), 360);
    return () => window.clearTimeout(timer);
  }, [activeIndex]);

  if (categories.length === 0) {
    return (
      <div className="px-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="rounded-[1.8rem] border border-border/80 bg-surface/92 px-6 py-8 text-sm leading-7 text-muted">
          Todavia no hay categorias cargadas para destacar en la portada.
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, categories.length - 1);
  const activeCategory = categories[safeIndex];
  const activeBatchIndex = batchIndexByCategoryRef.current[activeCategory.id] ?? 0;

  const activeCategoryProducts = useMemo(() => {
    const products = activeCategory.products ?? [];

    if (products.length <= DESKTOP_BATCH_SIZE) {
      return products;
    }

    const maxStart = products.length - DESKTOP_BATCH_SIZE;
    const start = Math.min(activeBatchIndex, maxStart);

    return products.slice(start, start + DESKTOP_BATCH_SIZE);
  }, [activeBatchIndex, activeCategory]);

  const mobileProducts = activeCategoryProducts.slice(0, 2);

  const getBadgeLabel = (index: number) => {
    if (index === 0) return "Nuevo";
    if (index === 3) return "Mas vendido";
    return undefined;
  };

  return (
    <section className="px-6 pb-2 sm:px-8 lg:pl-0 lg:pr-4 xl:pl-1 xl:pr-5 2xl:pl-2 2xl:pr-6">
      <div className="mx-auto flex w-full max-w-[128rem] flex-col space-y-4 lg:space-y-5">
        <div className="hidden lg:block">
          <div
            key={activeCategory.id}
            className="grid min-h-[36rem] items-stretch grid-cols-[minmax(26rem,0.43fr)_minmax(0,0.57fr)] gap-2.5 animate-[fade-up_700ms_cubic-bezier(0.16,1,0.3,1)] xl:min-h-[38rem] xl:gap-3 2xl:grid-cols-[minmax(28rem,0.45fr)_minmax(0,0.55fr)]"
          >
            <div className="relative z-0 h-full overflow-hidden rounded-l-[2.15rem] rounded-r-none bg-[linear-gradient(180deg,rgba(255,251,246,0.28),rgba(244,237,228,0.16))] shadow-[0_18px_48px_rgba(58,40,26,0.07)]">
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

            <div className="relative z-10 grid h-full grid-cols-4 grid-rows-2 gap-3 xl:gap-3.5 2xl:gap-4">
              {activeCategoryProducts.map((product, index) => (
                <ProductMiniCard
                  key={product.id}
                  product={product}
                  sizes="(min-width: 1536px) 11vw, (min-width: 1280px) 12vw, (min-width: 1024px) 14vw, 50vw"
                  badgeLabel={getBadgeLabel(index)}
                  className={index % 4 === 0 ? "lg:rounded-l-none lg:rounded-r-[1.2rem]" : undefined}
                  imageClassName={index % 4 === 0 ? "lg:rounded-l-none lg:rounded-r-[0.95rem]" : undefined}
                  style={
                    showDesktopProducts
                      ? {
                          animation: "fade-up 520ms cubic-bezier(0.16,1,0.3,1) both",
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
              aria-pressed={index === safeIndex}
              onClick={() => moveToCategory(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === safeIndex
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
