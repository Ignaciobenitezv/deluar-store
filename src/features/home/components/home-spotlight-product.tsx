"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import type { HomeSpotlightProduct } from "@/features/home/types";

type HomeSpotlightProductProps = {
  product: HomeSpotlightProduct | null;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function HomeSpotlightProduct({ product }: HomeSpotlightProductProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
  }, [product?.id]);

  if (!product || product.images.length === 0) {
    return null;
  }

  const safeIndex = Math.min(activeImageIndex, product.images.length - 1);
  const activeImage = product.images[safeIndex];
  const bulletItems = useMemo(
    () => product.attributes.filter((attribute) => attribute.value).slice(0, 3),
    [product.attributes],
  );
  const hasStock = product.stock > 0;
  const quantityMax = Math.min(Math.max(product.stock, 1), 10);

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(current - 1, 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(current + 1, quantityMax));
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[4.5rem_minmax(0,1fr)_26rem] lg:items-start lg:gap-6">
      <div className="order-2 flex gap-2 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-visible">
        {product.images.map((image, index) => (
          <button
            key={`${product.id}-${index}`}
            type="button"
            aria-label={`Ver imagen ${index + 1} de ${product.title}`}
            onClick={() => setActiveImageIndex(index)}
            className={`relative h-[5.2rem] w-[4.1rem] shrink-0 overflow-hidden rounded-[0.35rem] border bg-[#efe6da] transition-colors duration-200 ${
              index === safeIndex ? "border-[#c9bcad]" : "border-[#e8e2da] hover:border-[#d5ccbf]"
            }`}
          >
            {image.url ? (
              <Image src={image.url} alt={image.alt} fill sizes="66px" className="object-cover" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="order-1 overflow-hidden rounded-[0.45rem] bg-white lg:order-2">
        <div className="relative min-h-[26rem] bg-[#efe6da] lg:h-[31rem]">
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

      <div className="order-3 space-y-5 rounded-[0.45rem] bg-white p-1 lg:p-0">
        <div className="space-y-2">
          <p className="text-[0.62rem] uppercase tracking-[0.18em] text-muted/74">
            {product.categoryTitle}
          </p>
          <h2 className="text-[1.9rem] font-semibold leading-[1.02] tracking-tight text-foreground">
            {product.title}
          </h2>
          <p className="text-[0.84rem] leading-6 text-muted">
            {product.shortDescription}
          </p>
        </div>

        {bulletItems.length > 0 ? (
          <ul className="space-y-2 text-[0.78rem] leading-5 text-foreground/82">
            {bulletItems.map((attribute) => (
              <li key={`${attribute.label}-${attribute.value}`} className="flex gap-2">
                <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-foreground/50" />
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
            <p className="text-[0.74rem] leading-5 text-muted">
              Transferencia: {formatPrice(product.transferPrice)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-[0.62rem] uppercase tracking-[0.18em] text-muted/74">Cantidad</p>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-[#ddd5ca] bg-white">
              <button
                type="button"
                onClick={decreaseQuantity}
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
                onClick={increaseQuantity}
                disabled={!hasStock || quantity >= quantityMax}
                aria-label="Aumentar cantidad"
                className="inline-flex h-10 w-10 items-center justify-center text-base text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>

            <div className="min-w-0 text-[0.72rem] leading-5 text-muted">
              {hasStock ? `Stock disponible: ${product.stock}` : "Sin stock disponible"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[12rem] flex-1">
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
            className="text-[0.64rem] uppercase tracking-[0.16em] text-foreground/74 transition-colors hover:text-foreground"
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </section>
  );
}
