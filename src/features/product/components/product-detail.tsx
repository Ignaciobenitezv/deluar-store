"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { ProductCard } from "@/features/catalog/components/product-card";
import type { ProductDetailData } from "@/features/catalog/types";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ProductGallery } from "@/features/product/components/product-gallery";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

type ProductDetailProps = {
  product: ProductDetailData;
};

export function ProductDetail({ product }: ProductDetailProps) {
  const [activeVariantId, setActiveVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [descOpen, setDescOpen] = useState(true);
  const relatedScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const activeVariant = product.colorVariants.find((v) => v.id === activeVariantId);
  const activeStock = activeVariant?.stock ?? product.stock;
  const activeBasePrice = activeVariant?.basePrice ?? product.basePrice;
  const activeTransferPrice = activeVariant?.transferPrice ?? product.transferPrice;
  const activeImages = activeVariant?.images.length ? activeVariant.images : product.images;
  const activePrimaryImageUrl = activeVariant?.primaryImageUrl ?? product.primaryImageUrl;
  const activePrimaryImageAlt = activeVariant?.primaryImageAlt ?? product.primaryImageAlt;
  const hasStock = activeStock > 0;
  const quantityMax = Math.min(Math.max(activeStock, 1), 10);
  const checkRelatedScroll = () => {
    const el = relatedScrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;

    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  };
  const scrollRelatedLeft = () => {
    relatedScrollRef.current?.scrollBy({ left: -200, behavior: "smooth" });
  };
  const scrollRelatedRight = () => {
    relatedScrollRef.current?.scrollBy({ left: 200, behavior: "smooth" });
  };

  useEffect(() => {
    checkRelatedScroll();
  }, []);

  return (
    <div className="space-y-20 pt-6 pb-0">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-start lg:gap-14">
        <ProductGallery images={activeImages} title={product.title} />

        <div className="space-y-7 lg:sticky lg:top-28">
          <nav className="text-[0.7rem] uppercase tracking-[0.22em] text-muted">
            <Link href={`/productos/${product.categorySlug}`} className="hover:text-foreground transition-colors">
              {product.categoryTitle}
            </Link>
            {product.subcategoryTitle && (
              <>
                <span className="mx-2">/</span>
                <span>{product.subcategoryTitle}</span>
              </>
            )}
          </nav>

          <div>
            <h1 className="text-[1.85rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2.2rem]">
              {product.title}
            </h1>
            {product.shortDescription && (
              <p className="mt-2.5 text-sm leading-6 text-muted">
                {product.shortDescription}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[1.9rem] font-semibold tracking-tight text-foreground sm:text-[2.1rem]">
              {formatPrice(activeBasePrice)}
            </p>
            {activeTransferPrice ? (
              <p className="text-sm text-muted">
                <span className="font-medium text-foreground">
                  {formatPrice(activeTransferPrice)}
                </span>{" "}
                con transferencia
              </p>
            ) : null}
          </div>

          <div className="h-px bg-border/50" />

          {product.colorVariants.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-muted">
                Color:{" "}
                <span className="text-foreground">
                  {activeVariant?.title ?? "Sin seleccionar"}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colorVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setActiveVariantId(variant.id);
                      setQuantity(1);
                    }}
                    aria-label={`Color ${variant.title}`}
                    className={`relative h-14 w-11 overflow-hidden rounded border transition-all ${
                      activeVariant?.id === variant.id
                        ? "border-foreground/50 ring-1 ring-foreground/15"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    {variant.thumbnailUrl ? (
                      <Image
                        src={variant.thumbnailUrl}
                        alt={variant.thumbnailAlt}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full bg-[#efe5d8]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 rounded-full ${
                hasStock ? "bg-green-500" : "bg-neutral-300"
              }`}
            />
            <span className="text-sm text-muted">
              {hasStock
                ? `Stock disponible: ${activeStock}`
                : "Sin stock disponible"}
            </span>
          </div>

          <div className="flex items-stretch gap-3">
            <div className="flex items-center rounded border border-border/70 bg-white/50">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                disabled={!hasStock || quantity <= 1}
                aria-label="Reducir cantidad"
                className="flex h-12 w-10 items-center justify-center text-lg text-muted transition-colors hover:text-foreground disabled:opacity-35"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm font-medium text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(q + 1, quantityMax))}
                disabled={!hasStock || quantity >= quantityMax}
                aria-label="Aumentar cantidad"
                className="flex h-12 w-10 items-center justify-center text-lg text-muted transition-colors hover:text-foreground disabled:opacity-35"
              >
                +
              </button>
            </div>
            <div className="flex-1">
              <AddToCartButton
                quantity={quantity}
                disabled={!hasStock}
                product={{
                  id: activeVariant ? `${product.id}:${activeVariant.id}` : product.id,
                  productId: product.id,
                  slug: product.slug,
                  title: product.title,
                  imageUrl: activePrimaryImageUrl,
                  imageAlt: activePrimaryImageAlt,
                  basePrice: activeBasePrice,
                  transferPrice: activeTransferPrice,
                  variantId: activeVariant?.id,
                  variantLabel: activeVariant?.title,
                  variantValue: activeVariant?.value,
                  sku: activeVariant?.sku,
                  productHref: product.productHref,
                }}
              />
            </div>
          </div>

          {product.attributes.length > 0 ? (
            <div className="border-t border-border/50 pt-5 space-y-3">
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-muted">
                Detalles del producto
              </p>
              <div className="flex flex-wrap gap-2">
                {product.attributes.map((attribute) => (
                  <span
                    key={`${attribute.label}-${attribute.value}`}
                    className="rounded border border-border/60 bg-white/40 px-3 py-1.5 text-xs text-foreground/80"
                  >
                    <span className="text-muted">{attribute.label}:</span>{" "}
                    {attribute.value}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {product.description.length > 0 ? (
            <div className="border-t border-border/50">
              <button
                type="button"
                onClick={() => setDescOpen((o) => !o)}
                className="flex w-full items-center justify-between py-4 text-left"
              >
                <span className="text-[0.7rem] uppercase tracking-[0.22em] text-muted">
                  Descripción
                </span>
                <span className="text-base text-muted">{descOpen ? "−" : "+"}</span>
              </button>
              {descOpen ? (
                <div className="space-y-3 pb-4 text-sm leading-7 text-muted">
                  {product.description.map((paragraph, index) => (
                    <p key={`${product.id}-p-${index}`}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {product.relatedProducts.length > 0 ? (
        <div className="relative left-1/2 right-1/2 -mb-14 w-screen -ml-[50vw] -mr-[50vw] bg-white pt-8 pb-14 sm:-mb-16 sm:pb-16">
          <section className="mx-auto max-w-[1200px] space-y-5 px-4 lg:px-8">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Productos similares
            </h2>

            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={scrollRelatedLeft}
                aria-label="Productos similares anteriores"
                className={`absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/50 text-lg font-light leading-none text-foreground shadow-sm backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                  canScrollLeft ? "opacity-70" : "pointer-events-none opacity-0"
                }`}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={scrollRelatedRight}
                aria-label="Productos similares siguientes"
                className={`absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/50 text-lg font-light leading-none text-foreground shadow-sm backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                  canScrollRight ? "opacity-70" : "pointer-events-none opacity-0"
                }`}
              >
                ›
              </button>

              {/* Mobile: horizontal scroll */}
              <div
                ref={relatedScrollRef}
                className="flex w-full gap-4 overflow-x-auto scroll-smooth"
                style={{ scrollbarWidth: "none" }}
                onScroll={checkRelatedScroll}
              >
                {product.relatedProducts.map((p) => (
                  <div key={p.id} className="w-[45vw] shrink-0">
                    <ProductCard product={p} showCommerceEnhancements={false} />
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: grid */}
            <div className="hidden lg:block">
              <ProductGrid products={product.relatedProducts} variant="desktopCatalog" />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
