"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import type { HomeNewInProduct } from "@/features/home/types";

type HomeNewInFeaturedPdpProps = {
  product: HomeNewInProduct | null;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function HomeNewInFeaturedPdp({ product }: HomeNewInFeaturedPdpProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);
  const bulletItems = useMemo(
    () => (product?.attributes ?? []).filter((attribute) => attribute.value).slice(0, 4),
    [product?.attributes],
  );

  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    setThumbnailStartIndex(0);
  }, [product?.id]);

  if (!product || product.images.length === 0) {
    return null;
  }

  const safeIndex = Math.min(activeImageIndex, product.images.length - 1);
  const activeImage = product.images[safeIndex];
  const hasStock = product.stock > 0;
  const quantityMax = Math.min(Math.max(product.stock, 1), 10);
  const visibleThumbnailCount = 5;
  const maxThumbnailStartIndex = Math.max(product.images.length - visibleThumbnailCount, 0);
  const canScrollThumbnailsUp = thumbnailStartIndex > 0;
  const canScrollThumbnailsDown = thumbnailStartIndex < maxThumbnailStartIndex;

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={product.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="grid gap-5 lg:grid-cols-[4.75rem_minmax(0,1fr)_24rem] lg:items-start lg:gap-6"
      >
          <div className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:hidden lg:pb-0">
            {product.images.map((image, index) => (
              <button
                key={`${product.id}-${index}`}
                type="button"
                aria-label={`Ver imagen ${index + 1} de ${product.title}`}
                onClick={() => setActiveImageIndex(index)}
                className={`relative h-[5.8rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[0.35rem] border bg-[#efe6da] transition-colors duration-200 ${
                  index === safeIndex ? "border-[#cfb79e]" : "border-[#e8dfd5] hover:border-[#dbcdbf]"
                }`}
              >
                {image.url ? (
                  <Image src={image.url} alt={image.alt} fill sizes="72px" className="object-cover" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="order-2 hidden lg:order-1 lg:flex lg:h-[34rem] lg:flex-col lg:items-center lg:justify-start">
            <div className="relative h-full w-[4.5rem]">
              {product.images.length > visibleThumbnailCount ? (
                <button
                  type="button"
                  aria-label="Miniaturas anteriores"
                  onClick={() => setThumbnailStartIndex((current) => Math.max(current - 1, 0))}
                  disabled={!canScrollThumbnailsUp}
                  className="absolute inset-x-0 top-0 z-20 mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ddd4c8] bg-white/82 text-foreground/70 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
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
                    <path d="M3.5 9.5 8 5l4.5 4.5" />
                  </svg>
                </button>
              ) : null}

              <div className="h-full overflow-hidden">
                {canScrollThumbnailsUp ? (
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#f6efe6] to-transparent" />
                ) : null}
                {canScrollThumbnailsDown ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[#f6efe6] to-transparent" />
                ) : null}

                <div
                  className="flex flex-col gap-2 transition-transform duration-300 ease-out"
                  style={{ transform: `translateY(-${thumbnailStartIndex * 6.3}rem)` }}
                >
                  {product.images.map((image, index) => (
                    <button
                      key={`${product.id}-${index}`}
                      type="button"
                      aria-label={`Ver imagen ${index + 1} de ${product.title}`}
                      onClick={() => {
                        setActiveImageIndex(index);

                        if (index < thumbnailStartIndex) {
                          setThumbnailStartIndex(index);
                        } else if (index >= thumbnailStartIndex + visibleThumbnailCount) {
                          setThumbnailStartIndex(index - visibleThumbnailCount + 1);
                        }
                      }}
                      className={`relative h-[5.8rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[0.35rem] border bg-[#efe6da] transition-colors duration-200 ${
                        index === safeIndex
                          ? "border-[#cfb79e]"
                          : "border-[#e8dfd5] hover:border-[#dbcdbf]"
                      }`}
                    >
                      {image.url ? (
                        <Image
                          src={image.url}
                          alt={image.alt}
                          fill
                          sizes="72px"
                          className="object-cover"
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {product.images.length > visibleThumbnailCount ? (
                <button
                  type="button"
                  aria-label="Miniaturas siguientes"
                  onClick={() =>
                    setThumbnailStartIndex((current) => Math.min(current + 1, maxThumbnailStartIndex))
                  }
                  disabled={!canScrollThumbnailsDown}
                  className="absolute inset-x-0 bottom-0 z-20 mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ddd4c8] bg-white/82 text-foreground/70 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
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
                    <path d="M3.5 6.5 8 11l4.5-4.5" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          <div className="order-1 overflow-hidden rounded-[0.45rem] bg-[#f6efe6] lg:order-2">
            <div className="relative aspect-[1/1.06] min-h-[22rem] sm:min-h-[25rem] lg:h-[34rem] lg:min-h-0">
              {activeImage?.url ? (
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt}
                  fill
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  className="object-cover"
                />
              ) : null}
            </div>
          </div>

          <div className="order-3 space-y-5 lg:pt-1">
            <div className="space-y-2.5">
              <p className="text-[0.66rem] uppercase tracking-[0.18em] text-muted/76">
                {product.categoryTitle}
              </p>
              <h2 className="text-[1.9rem] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-[2.2rem]">
                {product.title}
              </h2>
              <p className="max-w-[34ch] text-[0.88rem] leading-6 text-muted">
                {product.shortDescription}
              </p>
            </div>

            {bulletItems.length > 0 ? (
              <ul className="space-y-2.5 text-[0.79rem] leading-5 text-foreground/82">
                {bulletItems.map((attribute) => (
                  <li key={`${attribute.label}-${attribute.value}`} className="flex gap-2.5">
                    <span className="mt-[0.42rem] h-1 w-1 shrink-0 rounded-full bg-foreground/50" />
                    <span>
                      <span className="font-medium">{attribute.label}:</span> {attribute.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="space-y-1.5">
              <p className="text-[1.42rem] font-semibold leading-none text-foreground">
                {formatPrice(product.basePrice)}
              </p>
              {product.transferPrice ? (
                <p className="text-[0.84rem] leading-5 text-[#c47a2c]">
                  <span className="font-medium opacity-80">Transferencia:</span>{" "}
                  <span className="font-semibold">{formatPrice(product.transferPrice)}</span>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-muted/74">Cantidad</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-[#ddd5ca] bg-white/72">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(current - 1, 1))}
                    disabled={!hasStock || quantity <= 1}
                    aria-label="Reducir cantidad"
                    className="inline-flex h-10 w-10 items-center justify-center text-base text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="min-w-10 text-center text-[0.92rem] font-medium text-foreground">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.min(current + 1, quantityMax))}
                    disabled={!hasStock || quantity >= quantityMax}
                    aria-label="Aumentar cantidad"
                    className="inline-flex h-10 w-10 items-center justify-center text-base text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <div className="min-w-0 text-[0.74rem] leading-5 text-muted">
                  {hasStock ? `Stock disponible: ${product.stock}` : "Sin stock disponible"}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="min-w-[12rem] max-w-[22rem]">
                <AddToCartButton
                  quantity={quantity}
                  disabled={!hasStock}
                  product={{
                    id: product.id,
                    productId: product.id,
                    slug: product.slug,
                    title: product.title,
                    imageUrl: activeImage?.url ?? product.images[0]?.url ?? null,
                    imageAlt: activeImage?.alt ?? product.images[0]?.alt ?? product.title,
                    basePrice: product.basePrice,
                    transferPrice: product.transferPrice,
                    productHref: product.productHref,
                  }}
                />
              </div>
              <Link
                href={product.productHref}
                className="block text-center text-[0.64rem] uppercase tracking-[0.16em] text-foreground/74 transition-colors hover:text-foreground"
              >
                Ver detalle
              </Link>
            </div>
          </div>
      </motion.section>
    </AnimatePresence>
  );
}
