"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CatalogProductCard } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

type HomeOffersCarouselProps = {
  products: CatalogProductCard[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function getPrevIndex(index: number, total: number) {
  return (index - 1 + total) % total;
}

function getNextIndex(index: number, total: number) {
  return (index + 1) % total;
}

function OfferPreviewCard({
  product,
  direction,
  onClick,
}: {
  product: CatalogProductCard;
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver ${direction === "left" ? "oferta anterior" : "oferta siguiente"}: ${product.title}`}
      className={cn(
        "absolute top-1/2 hidden w-[16rem] -translate-y-1/2 overflow-hidden rounded-[2rem] border border-[#dbc7b2]/55 bg-[linear-gradient(180deg,rgba(252,247,241,0.68),rgba(243,234,225,0.6))] shadow-[0_18px_40px_rgba(58,40,26,0.07)] transition-all duration-500 xl:block",
        direction === "left"
          ? "left-0 -translate-x-8 scale-[0.9] opacity-55 blur-[0.4px] hover:-translate-x-6 hover:opacity-70"
          : "right-0 translate-x-8 scale-[0.9] opacity-55 blur-[0.4px] hover:translate-x-6 hover:opacity-70",
      )}
    >
      <div className="relative aspect-[0.9/1] bg-[#eadfce]">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.imageAlt} fill sizes="16rem" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(235,223,206,0.94),rgba(206,186,166,0.92))]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,18,14,0.08),rgba(24,18,14,0.38))]" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-left text-white">
          <p className="text-[0.64rem] uppercase tracking-[0.22em] text-white/68">Oferta</p>
          <h3 className="mt-2 line-clamp-2 text-[1.2rem] font-medium leading-[1.08]">
            {product.title}
          </h3>
        </div>
      </div>
    </button>
  );
}

export function HomeOffersCarousel({ products }: HomeOffersCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isDesktopPaused, setIsDesktopPaused] = useState(false);

  const goToIndex = (nextIndex: number, nextDirection: 1 | -1) => {
    if (nextIndex === activeIndex) return;
    setDirection(nextDirection);
    setActiveIndex(nextIndex);
  };

  useEffect(() => {
    if (products.length === 0) {
      return;
    }

    setActiveIndex((current) => (current >= products.length ? 0 : current));
  }, [products]);

  useEffect(() => {
    if (products.length <= 1 || isDesktopPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((current) => getNextIndex(current, products.length));
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [products.length, isDesktopPaused]);

  if (products.length === 0) {
    return null;
  }

  const activeProduct = products[activeIndex];
  const hasMultipleProducts = products.length > 1;
  const previousProduct = hasMultipleProducts ? products[getPrevIndex(activeIndex, products.length)] : null;
  const nextProduct = hasMultipleProducts ? products[getNextIndex(activeIndex, products.length)] : null;

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Ofertas destacadas</p>
          <h2 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
            Oportunidades curadas para DELUAR
          </h2>
        </div>

        <Link
          href="/productos"
          className="inline-flex text-sm uppercase tracking-[0.22em] text-foreground/82 transition-colors hover:text-foreground"
        >
          Ver todos
        </Link>
      </div>

      <div className="relative">
        <div
          className="relative hidden min-h-[36rem] w-full items-center px-[8rem] lg:flex xl:px-[9rem] 2xl:px-[10rem]"
          onMouseEnter={() => setIsDesktopPaused(true)}
          onMouseLeave={() => setIsDesktopPaused(false)}
        >
          {hasMultipleProducts && previousProduct ? (
            <OfferPreviewCard
              product={previousProduct}
              direction="left"
              onClick={() => goToIndex(getPrevIndex(activeIndex, products.length), -1)}
            />
          ) : null}

          <div className="relative z-10 min-h-[36rem] w-full overflow-hidden rounded-[2.25rem]">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={activeProduct.id}
                custom={direction}
                initial={{ opacity: 0.72, x: direction > 0 ? 28 : -28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0.72, x: direction > 0 ? -28 : 28 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 z-10 grid w-full grid-cols-[minmax(18rem,0.95fr)_minmax(20rem,1.05fr)] overflow-hidden rounded-[2.25rem] border border-[#dcc8b4]/72 bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(244,236,227,0.94))] shadow-[0_28px_60px_rgba(58,40,26,0.08)]"
              >
                <div className="relative min-h-[36rem] bg-[#eadfce]">
                  {activeProduct.imageUrl ? (
                    <Image
                      src={activeProduct.imageUrl}
                      alt={activeProduct.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 34rem, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(235,223,206,0.98),rgba(201,181,160,0.92))]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,18,14,0.02),rgba(24,18,14,0.22))]" />
                </div>

                <div className="flex min-h-[36rem] flex-col justify-between p-8 xl:p-10">
                  <div className="space-y-5">
                    <span className="inline-flex min-h-8 items-center rounded-full border border-[#d9b99f]/72 bg-[#f5e5d3] px-4 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#73503f]">
                      Oferta
                    </span>
                    <div className="space-y-4">
                      <h3 className="max-w-[22rem] text-[2.4rem] font-semibold leading-[0.98] tracking-[0.02em] text-[#2f2219] xl:text-[2.75rem]">
                        {activeProduct.title}
                      </h3>
                      <p className="max-w-[27rem] text-[0.98rem] leading-7 text-[#6d594b] xl:text-[1.02rem]">
                        {activeProduct.shortDescription}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[2rem] font-semibold leading-none tracking-[0.01em] text-[#3a281e] xl:text-[2.3rem]">
                        {formatPrice(activeProduct.basePrice)}
                      </p>
                      {activeProduct.transferPrice ? (
                        <p className="text-[0.92rem] font-medium text-[#8a6754] xl:text-[0.96rem]">
                          Transferencia: {formatPrice(activeProduct.transferPrice)}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={activeProduct.productHref}
                        className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d3b192] bg-[#f1dcc7] px-6 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#5d4033] shadow-[0_10px_24px_rgba(84,58,42,0.1)] transition-all duration-300 hover:-translate-y-[1px] hover:border-[#c89f81] hover:bg-[#ebd0b4]"
                      >
                        Ver producto
                      </Link>

                      {hasMultipleProducts ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Oferta anterior"
                            onClick={() => goToIndex(getPrevIndex(activeIndex, products.length), -1)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d7c2ad]/72 bg-white/62 text-[#5e4436] transition-all duration-300 hover:border-[#caac92] hover:bg-[#f8efe6]"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            aria-label="Oferta siguiente"
                            onClick={() => goToIndex(getNextIndex(activeIndex, products.length), 1)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d7c2ad]/72 bg-white/62 text-[#5e4436] transition-all duration-300 hover:border-[#caac92] hover:bg-[#f8efe6]"
                          >
                            ›
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {hasMultipleProducts && nextProduct ? (
            <OfferPreviewCard
              product={nextProduct}
              direction="right"
              onClick={() => goToIndex(getNextIndex(activeIndex, products.length), 1)}
            />
          ) : null}
        </div>

        <div className="lg:hidden">
          <div className="relative h-[38rem] overflow-hidden rounded-[1.9rem] sm:h-[40rem]">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={`${activeProduct.id}-mobile`}
                custom={direction}
                initial={{ opacity: 0.76, x: direction > 0 ? 22 : -22 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0.76, x: direction > 0 ? -22 : 22 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.9rem] border border-[#dcc8b4]/72 bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(244,236,227,0.94))] shadow-[0_20px_40px_rgba(58,40,26,0.07)]"
              >
                <div className="relative h-[260px] bg-[#eadfce] sm:h-[300px]">
                  {activeProduct.imageUrl ? (
                    <Image
                      src={activeProduct.imageUrl}
                      alt={activeProduct.imageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, 90vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(235,223,206,0.98),rgba(201,181,160,0.92))]" />
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                  <div className="space-y-3">
                    <span className="inline-flex min-h-7 items-center rounded-full border border-[#d9b99f]/72 bg-[#f5e5d3] px-3.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#73503f]">
                      Oferta
                    </span>
                    <h3 className="text-[1.9rem] font-semibold leading-[1] tracking-[0.02em] text-[#2f2219]">
                      {activeProduct.title}
                    </h3>
                    <p className="text-[0.92rem] leading-6 text-[#6d594b]">{activeProduct.shortDescription}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[1.7rem] font-semibold leading-none text-[#3a281e]">
                      {formatPrice(activeProduct.basePrice)}
                    </p>
                    {activeProduct.transferPrice ? (
                      <p className="text-[0.88rem] font-medium text-[#8a6754]">
                        Transferencia: {formatPrice(activeProduct.transferPrice)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={activeProduct.productHref}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d3b192] bg-[#f1dcc7] px-5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#5d4033]"
                    >
                      Ver producto
                    </Link>

                    {hasMultipleProducts ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Oferta anterior"
                          onClick={() => goToIndex(getPrevIndex(activeIndex, products.length), -1)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7c2ad]/72 bg-white/62 text-[#5e4436]"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          aria-label="Oferta siguiente"
                          onClick={() => goToIndex(getNextIndex(activeIndex, products.length), 1)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7c2ad]/72 bg-white/62 text-[#5e4436]"
                        >
                          ›
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {hasMultipleProducts ? (
          <div className="flex items-center justify-center gap-2 pt-5">
            {products.map((product, index) => (
              <button
                key={product.id}
                type="button"
                aria-label={`Ir a la oferta ${index + 1}`}
                aria-pressed={index === activeIndex}
                onClick={() => goToIndex(index, index > activeIndex ? 1 : -1)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === activeIndex
                    ? "w-7 bg-[var(--color-accent-strong)]"
                    : "w-2 bg-border/80 hover:bg-border",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
