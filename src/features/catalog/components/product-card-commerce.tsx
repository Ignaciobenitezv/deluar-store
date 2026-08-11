"use client";

import Link from "next/link";
import { useTransition, type MouseEvent } from "react";
import { useCart } from "@/features/cart/cart-context";
import type { CartProductInput } from "@/features/cart/types";
import { cn } from "@/lib/utils";

export type ProductCardCommerceData = {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  transferPrice?: number;
  stock: number;
  imageUrl: string | null;
  imageAlt: string;
  productHref: string;
  hasSelectableOptions: boolean;
};

type ProductCardCommerceVariant = "default" | "catalog";

const catalogCtaBase =
  "inline-flex h-10 w-full appearance-none items-center justify-center rounded-[6px] bg-[#5f4033] px-5 font-sans text-center text-[11px] font-medium normal-case tracking-normal whitespace-nowrap leading-none text-white shadow-[0_8px_18px_rgba(91,64,51,0.1)] transition duration-200 hover:bg-[#67493b] hover:shadow-[0_10px_22px_rgba(91,64,51,0.14)]";

const catalogCtaLabelBase = "text-[11px] font-medium leading-none tracking-normal text-white";

function renderCatalogCtaLabel(label: string) {
  return <span className={catalogCtaLabelBase}>{label}</span>;
}

function toCartProduct(product: ProductCardCommerceData): CartProductInput {
  return {
    id: product.id,
    productId: product.id,
    slug: product.slug,
    title: product.title,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    basePrice: product.basePrice,
    transferPrice: product.transferPrice,
    stock: product.stock,
    productHref: product.productHref,
  };
}

type ProductCardCtaProps = {
  product: ProductCardCommerceData;
  className?: string;
  label?: string;
  variant?: ProductCardCommerceVariant;
  outOfStockLabel?: string;
};

function getCtaClassName(variant: ProductCardCommerceVariant) {
  return variant === "catalog"
    ? catalogCtaBase
    : "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#d8c9bb] px-2 text-[10px] font-medium leading-none text-[#3a2a22] transition hover:border-[#6f4b3a] hover:text-[#6f4b3a] sm:px-3 sm:text-[11px]";
}

export function ProductCardCta({
  product,
  className,
  label = "Añadir al carrito",
  variant = "default",
  outOfStockLabel = "Sin stock",
}: ProductCardCtaProps) {
  const { addItem } = useCart();
  const [isPending, startTransition] = useTransition();
  const isOutOfStock = product.stock <= 0;
  const ctaClassName = getCtaClassName(variant);

  if (product.hasSelectableOptions) {
    return null;
  }

  if (isOutOfStock) {
    return (
      <span
        className={cn(ctaClassName, "cursor-not-allowed opacity-100", className)}
      >
        {renderCatalogCtaLabel(outOfStockLabel)}
      </span>
    );
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    startTransition(() => {
      addItem(toCartProduct(product), 1);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        ctaClassName,
        "disabled:cursor-wait disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
        className,
      )}
    >
      {renderCatalogCtaLabel(label)}
    </button>
  );
}

type ProductCardActionsProps = {
  product: ProductCardCommerceData;
  className?: string;
  buttonClassName?: string;
  addLabel?: string;
  viewLabel?: string;
  variant?: ProductCardCommerceVariant;
  outOfStockLabel?: string;
};

export function ProductCardActions({
  product,
  className,
  buttonClassName,
  addLabel,
  viewLabel = "Ver producto",
  variant = "default",
  outOfStockLabel = "Sin stock",
}: ProductCardActionsProps) {
  if (variant === "catalog") {
    const ctaClassName = cn(
      getCtaClassName(variant),
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
      buttonClassName,
    );

    if (product.stock <= 0) {
      return (
        <div className={cn("pt-2", className)}>
          <span className={cn(ctaClassName, "cursor-not-allowed")}>
            {renderCatalogCtaLabel(outOfStockLabel)}
          </span>
        </div>
      );
    }

    if (product.hasSelectableOptions) {
      return (
        <div className={cn("pt-2", className)}>
          <Link
            href={product.productHref}
            onClick={(event) => event.stopPropagation()}
            className={ctaClassName}
          >
            {renderCatalogCtaLabel(viewLabel)}
          </Link>
        </div>
      );
    }

    return (
      <div className={cn("pt-2", className)}>
        <ProductCardCta
          product={product}
          label={addLabel}
          className={cn(buttonClassName, "w-full")}
          variant={variant}
          outOfStockLabel={outOfStockLabel}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-nowrap items-center gap-1.5 pt-2 sm:gap-2", className)}>
      <ProductCardCta
        product={product}
        label={addLabel}
        className={buttonClassName}
        variant={variant}
        outOfStockLabel={outOfStockLabel}
      />
      <Link
        href={product.productHref}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          getCtaClassName(variant),
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
          buttonClassName,
        )}
      >
        {viewLabel}
      </Link>
    </div>
  );
}
