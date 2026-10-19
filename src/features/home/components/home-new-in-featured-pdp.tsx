"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { archivo } from "@/features/home/fonts";
import type { HomeNewInProduct } from "@/features/home/types";
import { cn } from "@/lib/utils";

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

// One height drives the main photo and the thumbnail column so they stay aligned.
const GALLERY_HEIGHT = "lg:h-[30rem] xl:h-[32rem]";

// Below this share of the photo surviving a `cover` crop, show it whole instead
// (`contain` on the frame's cream surface) so the product is never cut away.
const MIN_COVER_VISIBLE_SHARE = 0.85;

function getMainImageFit(imageRatio: number | null, frameRatio: number | null) {
  if (!imageRatio || !frameRatio) {
    return "contain" as const;
  }

  const visibleShare = Math.min(imageRatio, frameRatio) / Math.max(imageRatio, frameRatio);
  return visibleShare >= MIN_COVER_VISIBLE_SHARE ? ("cover" as const) : ("contain" as const);
}

export function HomeNewInFeaturedPdp({ product }: HomeNewInFeaturedPdpProps) {
  if (!product || product.images.length === 0) {
    return null;
  }

  return <HomeNewInFeaturedPdpContent key={product.id} product={product} />;
}

function HomeNewInFeaturedPdpContent({
  product,
}: {
  product: NonNullable<HomeNewInFeaturedPdpProps["product"]>;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);
  const mainFrameRef = useRef<HTMLDivElement | null>(null);
  const [frameRatio, setFrameRatio] = useState<number | null>(null);
  const [loadedImage, setLoadedImage] = useState<{ url: string; ratio: number } | null>(null);
  const bulletItems = useMemo(
    () => product.attributes.filter((attribute) => attribute.value).slice(0, 4),
    [product.attributes],
  );

  const safeIndex = Math.min(activeImageIndex, product.images.length - 1);
  const activeImage = product.images[safeIndex];
  const hasStock = product.stock > 0;
  const quantityMax = Math.min(Math.max(product.stock, 1), 10);
  const visibleThumbnailCount = 5;
  const maxThumbnailStartIndex = Math.max(product.images.length - visibleThumbnailCount, 0);
  const canScrollThumbnailsUp = thumbnailStartIndex > 0;
  const canScrollThumbnailsDown = thumbnailStartIndex < maxThumbnailStartIndex;
  const mainImageRatio = loadedImage && loadedImage.url === activeImage?.url ? loadedImage.ratio : null;
  const mainImageFit = getMainImageFit(mainImageRatio, frameRatio);

  // The frame changes shape per breakpoint (square on phones, 4:5 above), so
  // the fit is decided against its real rendered proportion.
  useEffect(() => {
    const frame = mainFrameRef.current;

    if (!frame) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFrameRatio(height > 0 ? width / height : null);
    });
    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  return (
    // Product-change motion is owned by the parent controller so the
    // spotlight band and this presentation move in one beat.
    <section className="grid gap-5 lg:mx-auto lg:max-w-[70rem] lg:grid-cols-[4.5rem_auto_minmax(0,1fr)] lg:items-start lg:gap-x-6 xl:gap-x-8">
      <div className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:hidden lg:pb-0">
        {product.images.map((image, index) => (
          <button
            key={`${product.id}-${index}`}
            type="button"
            aria-label={`Ver imagen ${index + 1} de ${product.title}`}
            onClick={() => setActiveImageIndex(index)}
            className={`relative h-[5.8rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[0.35rem] border bg-line/60 transition-colors duration-200 ${
              index === safeIndex ? "border-accent/70" : "border-line/70 hover:border-line"
            }`}
          >
            {image.url ? (
              <Image src={image.url} alt={image.alt} fill sizes="72px" className="object-cover" />
            ) : null}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "order-2 hidden lg:order-1 lg:flex lg:self-start lg:flex-col lg:items-center lg:justify-start",
          GALLERY_HEIGHT,
        )}
      >
        <div className="relative h-full max-h-full w-[4.5rem] overflow-hidden">
          {product.images.length > visibleThumbnailCount ? (
            <button
              type="button"
              aria-label="Miniaturas anteriores"
              onClick={() => setThumbnailStartIndex((current) => Math.max(current - 1, 0))}
              disabled={!canScrollThumbnailsUp}
              className="absolute inset-x-0 top-0 z-20 mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/90 bg-surface-raised/82 text-foreground/70 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
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

          <div className="h-full max-h-full overflow-hidden">
            {canScrollThumbnailsUp ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-canvas to-transparent" />
            ) : null}
            {canScrollThumbnailsDown ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-canvas to-transparent" />
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
                  className={`relative h-[5.8rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[0.35rem] border bg-line/60 transition-colors duration-200 ${
                    index === safeIndex
                      ? "border-accent/70"
                      : "border-line/70 hover:border-line"
                  }`}
                >
                  {image.url ? (
                    <Image src={image.url} alt={image.alt} fill sizes="72px" className="object-cover" />
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
              className="absolute inset-x-0 bottom-0 z-20 mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/90 bg-surface-raised/82 text-foreground/70 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
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

      <div
        ref={mainFrameRef}
        className={cn(
          "relative order-1 aspect-square w-full overflow-hidden rounded-[0.5rem] bg-line/60 sm:aspect-[4/5] lg:order-2 lg:aspect-auto lg:w-[24rem] xl:w-[25.5rem]",
          GALLERY_HEIGHT,
        )}
      >
        {activeImage?.url ? (
          <Image
            src={activeImage.url}
            alt={activeImage.alt}
            fill
            sizes="(min-width: 1024px) 26rem, 100vw"
            className={mainImageFit === "cover" ? "object-cover" : "object-contain"}
            style={mainImageFit === "cover" ? { objectPosition: activeImage.objectPosition } : undefined}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;

              if (activeImage.url && naturalWidth > 0 && naturalHeight > 0) {
                setLoadedImage({ url: activeImage.url, ratio: naturalWidth / naturalHeight });
              }
            }}
          />
        ) : null}
      </div>

      <div className="order-3 flex flex-col items-start lg:max-w-[32rem] lg:pt-2">
        <h2
          className={cn(
            archivo.className,
            "text-[1.75rem] font-bold leading-[1.02] tracking-[-0.015em] text-foreground [font-stretch:87.5%] [text-wrap:balance] sm:text-[2rem] lg:text-[clamp(2rem,2.5vw,2.5rem)]",
          )}
        >
          {product.title}
        </h2>
        {product.shortDescription ? (
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-muted">
            {product.shortDescription}
          </p>
        ) : null}

        {bulletItems.length > 0 ? (
          <ul className="mt-4 space-y-1.5 text-sm leading-6 text-foreground/85">
            {bulletItems.map((attribute) => (
              <li key={`${attribute.label}-${attribute.value}`} className="flex gap-2.5">
                <span className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-foreground/50" />
                <span>
                  <span className="font-medium">{attribute.label}:</span> {attribute.value}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 w-full border-t border-border/80 pt-5">
          <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-ink lg:text-[1.9rem]">
            {product.pricePrefix ? `${product.pricePrefix} ` : null}
            {formatPrice(product.basePrice)}
          </p>
          {product.transferPrice ? (
            <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-promo">
              <span className="text-[1.1rem] font-extrabold leading-none tabular-nums lg:text-[1.25rem]">
                {formatPrice(product.transferPrice)}
              </span>
              <span className="rounded-full bg-promo px-2 py-1 text-xs font-bold leading-none tracking-[0.04em] text-promo-foreground">
                20% OFF
              </span>
              <span className="text-sm font-semibold">con transferencia</span>
            </p>
          ) : null}
        </div>

        <div className="mt-6 w-full">
          <p className="mb-2 text-[0.7rem] uppercase tracking-[0.16em] text-muted">Cantidad</p>

          {/* Stacked on phones, where the column is too narrow for the shared
              add-to-cart button to keep its label on one line. */}
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex h-14 self-start items-center rounded-full border border-line/90 bg-surface-raised/72">
              <button
                type="button"
                aria-label="Disminuir cantidad"
                onClick={() => setQuantity((current) => Math.max(current - 1, 1))}
                disabled={!hasStock || quantity <= 1}
                className="inline-flex h-full w-12 items-center justify-center text-base text-muted hover:text-foreground disabled:opacity-40"
              >
                -
              </button>

              <span className="min-w-8 text-center text-base font-medium tabular-nums text-foreground">
                {quantity}
              </span>

              <button
                type="button"
                aria-label="Aumentar cantidad"
                onClick={() => setQuantity((current) => Math.min(current + 1, quantityMax))}
                disabled={!hasStock || quantity >= quantityMax}
                className="inline-flex h-full w-12 items-center justify-center text-base text-muted hover:text-foreground disabled:opacity-40"
              >
                +
              </button>
            </div>

            <div className="w-full flex-1">
              {product.hasSelectableOptions ? (
                <Link
                  href={product.productHref}
                  className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-cta px-6 text-sm uppercase tracking-[0.22em] shadow-[0_18px_44px_color-mix(in_srgb,var(--cta)_22%,transparent)] transition-all hover:translate-y-[-1px] hover:opacity-95"
                >
                  {/* Colour on a span: the global `a { color: inherit }` rule beats utilities on links. */}
                  <span className="text-cta-foreground">Ver producto</span>
                </Link>
              ) : (
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
                    stock: product.stock,
                    productHref: product.productHref,
                  }}
                />
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4 text-[13px]">
            <span className="text-muted">{hasStock ? "En stock" : "Sin stock"}</span>
            <Link
              href={product.productHref}
              className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
            >
              Ver detalle
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
