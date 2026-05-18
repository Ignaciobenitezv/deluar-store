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
    productHref: product.productHref,
  };
}

type ProductCardCtaProps = {
  product: ProductCardCommerceData;
  className?: string;
  label?: string;
};

const ctaClassName =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#d8c9bb] px-2 text-[10px] font-medium leading-none text-[#3a2a22] transition hover:border-[#6f4b3a] hover:text-[#6f4b3a] sm:px-3 sm:text-[11px]";

export function ProductCardCta({
  product,
  className,
  label = "Añadir al carrito",
}: ProductCardCtaProps) {
  const { addItem } = useCart();
  const [isPending, startTransition] = useTransition();
  const isOutOfStock = product.stock <= 0;

  if (product.hasSelectableOptions) {
    return null;
  }

  if (isOutOfStock) {
    return (
      <span
        className={cn(
          ctaClassName,
          "cursor-not-allowed border-neutral-200 text-neutral-400 hover:border-neutral-200 hover:text-neutral-400",
          className,
        )}
      >
        Sin stock
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
      className={cn(ctaClassName, "disabled:cursor-wait disabled:opacity-60", className)}
    >
      {label}
    </button>
  );
}

type ProductCardActionsProps = {
  product: ProductCardCommerceData;
  className?: string;
  buttonClassName?: string;
  addLabel?: string;
  viewLabel?: string;
};

export function ProductCardActions({
  product,
  className,
  buttonClassName,
  addLabel,
  viewLabel = "Ver producto",
}: ProductCardActionsProps) {
  return (
    <div className={cn("flex flex-nowrap items-center gap-1.5 pt-2 sm:gap-2", className)}>
      <ProductCardCta product={product} label={addLabel} className={buttonClassName} />
      <Link
        href={product.productHref}
        onClick={(event) => event.stopPropagation()}
        className={cn(ctaClassName, buttonClassName)}
      >
        {viewLabel}
      </Link>
    </div>
  );
}
