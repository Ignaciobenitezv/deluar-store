"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductGrid } from "@/features/catalog/components/product-grid";
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
  const hasStock = product.stock > 0;
  const [quantity, setQuantity] = useState(1);
  const quantityMax = Math.min(Math.max(product.stock, 1), 10);

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(current + 1, quantityMax));
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(current - 1, 1));
  };

  return (
    <div className="space-y-14">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)] lg:gap-14">
        <ProductGallery images={product.images} title={product.title} />

        <div className="space-y-7 rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.97),rgba(244,238,230,0.92))] px-6 py-7 shadow-[0_24px_60px_rgba(58,40,26,0.06)] sm:px-8 lg:sticky lg:top-28">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted">
              <Link href={`/productos/${product.categorySlug}`}>{product.categoryTitle}</Link>
              {product.subcategoryTitle ? <span>/ {product.subcategoryTitle}</span> : null}
            </div>
            <h1 className="text-4xl font-semibold tracking-[0.02em] text-foreground sm:text-[2.8rem] sm:leading-[1.05]">
              {product.title}
            </h1>
            <p className="max-w-xl text-sm leading-7 text-muted sm:text-base">
              {product.shortDescription}
            </p>
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-border/75 bg-white/72 px-5 py-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Precio</p>
              <p className="text-3xl font-semibold tracking-[0.01em] text-foreground sm:text-[2.15rem]">
                {formatPrice(product.basePrice)}
              </p>
            </div>
            {product.transferPrice ? (
              <div className="rounded-[1.2rem] bg-[rgba(167,88,60,0.08)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent-strong)]">
                  Precio con transferencia
                </p>
                <p className="mt-1 text-lg font-medium text-foreground">
                  {formatPrice(product.transferPrice)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-border/75 bg-surface/85 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Disponibilidad</p>
                <p
                  className={`text-sm font-medium ${
                    hasStock ? "text-foreground" : "text-muted"
                  }`}
                >
                  {hasStock ? `Stock disponible: ${product.stock}` : "Sin stock disponible"}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                  hasStock
                    ? "bg-[rgba(104,126,97,0.12)] text-[rgb(85,109,79)]"
                    : "bg-[rgba(124,111,97,0.12)] text-muted"
                }`}
              >
                {hasStock ? "Disponible" : "Agotado"}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Cantidad</p>
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center rounded-full border border-border/80 bg-white/82">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={!hasStock || quantity <= 1}
                    aria-label="Reducir cantidad"
                    className="inline-flex h-12 w-12 items-center justify-center text-base text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="min-w-12 text-center text-base font-medium text-foreground">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={!hasStock || quantity >= quantityMax}
                    aria-label="Aumentar cantidad"
                    className="inline-flex h-12 w-12 items-center justify-center text-base text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm leading-6 text-muted">
                  Elige la cantidad antes de sumar el producto al carrito.
                </p>
              </div>
            </div>

            <AddToCartButton
              quantity={quantity}
              disabled={!hasStock}
              product={{
                id: product.id,
                slug: product.slug,
                title: product.title,
                imageUrl: product.primaryImageUrl,
                imageAlt: product.primaryImageAlt,
                basePrice: product.basePrice,
                transferPrice: product.transferPrice,
                productHref: product.productHref,
              }}
            />

            <div className="grid gap-3 rounded-[1.2rem] border border-border/70 bg-white/64 px-4 py-4 text-sm leading-6 text-muted sm:grid-cols-2">
              <p>Seleccion curada para hogar y decoracion.</p>
              <p>El envio y el pago se confirmaran en el siguiente paso.</p>
            </div>
          </div>

          {product.attributes.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-[0.24em] text-muted">Detalles del producto</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {product.attributes.map((attribute) => (
                  <div
                    key={`${attribute.label}-${attribute.value}`}
                    className="rounded-[1.2rem] border border-border/70 bg-white/70 px-4 py-4"
                  >
                    <dt className="text-xs uppercase tracking-[0.18em] text-muted">
                      {attribute.label}
                    </dt>
                    <dd className="mt-2 text-sm leading-6 text-foreground/88">{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="space-y-5 rounded-[2rem] border border-border/80 bg-surface/92 px-6 py-8 sm:px-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Descripcion
            </p>
            <h2 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
              Pensado para integrarse con naturalidad en tu casa
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-foreground/80 sm:text-base">
            {product.description.length > 0 ? (
              product.description.map((paragraph, index) => (
                <p key={`${product.id}-paragraph-${index}`}>{paragraph}</p>
              ))
            ) : (
              <p>No hay una descripcion adicional cargada para este producto.</p>
            )}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.95),rgba(244,237,228,0.92))] px-6 py-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Compra online</p>
            <h2 className="text-2xl font-semibold tracking-[0.03em] text-foreground">
              Compra simple y clara
            </h2>
            <p className="text-sm leading-7 text-muted">
              La compra online y la coordinacion de envio se integraran en fases
              siguientes. Esta vista ya consume el producto real desde Sanity.
            </p>
            <div className="rounded-[1.2rem] border border-border/70 bg-white/68 px-4 py-4 text-sm leading-6 text-muted">
              Tu carrito, checkout base y creacion de orden ya estan activos para este
              producto.
            </div>
          </div>
        </aside>
      </section>

      {product.relatedProducts.length > 0 ? (
        <section className="space-y-6 rounded-[2rem] border border-border/80 bg-surface/70 px-5 py-6 sm:px-6 sm:py-7">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Relacionados
            </p>
            <h2 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
              Tambien puede interesarte
            </h2>
          </div>
          <ProductGrid products={product.relatedProducts} />
        </section>
      ) : null}
    </div>
  );
}
