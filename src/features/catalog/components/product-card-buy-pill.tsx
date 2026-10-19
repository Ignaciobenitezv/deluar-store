"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  getProductCardPurchaseMode,
  useProductCardAddToCart,
  type ProductCardCommerceData,
} from "@/features/catalog/components/product-card-commerce";
import { cn } from "@/lib/utils";

// The catalog card's buy control: a small dark pill. Same three modes as the
// rest of the cards (add, choose options, out of stock).

// How long the added / limit / error confirmation holds the pill. Also the
// lock against accidental double adds.
const FEEDBACK_MS = 1600;

type Feedback = "added" | "limit" | "error";

const FEEDBACK_COPY: Record<Feedback, { visual: string; spoken: string }> = {
  added: { visual: "Agregado", spoken: "Producto agregado al carrito" },
  limit: { visual: "Sin más stock", spoken: "No hay más stock disponible de este producto" },
  error: { visual: "No se pudo agregar", spoken: "No se pudo agregar el producto al carrito" },
};

const pillClassName =
  "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[8px] px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2";

// Size and colour on the inner span: the global `a`/`button` rules would
// override them on the control itself.
const labelClassName = "text-[13px] font-semibold leading-none";

export function ProductCardBuyPill({ product }: { product: ProductCardCommerceData }) {
  const feedbackTimeoutRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const { addToCart, isPending } = useProductCardAddToCart(product);
  const mode = getProductCardPurchaseMode(product);

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    },
    [],
  );

  const showFeedback = (next: Feedback) => {
    setFeedback(next);
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
  };

  const isLocked = isPending || feedback !== null;

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isLocked) {
      return;
    }

    try {
      const result = addToCart();
      showFeedback(result?.wasRejected || result?.wasLimited ? "limit" : "added");
    } catch {
      showFeedback("error");
    }
  };

  if (mode === "out-of-stock") {
    return (
      <span role="note" className={cn(pillClassName, "cursor-not-allowed bg-line")}>
        <span className={cn(labelClassName, "text-ink-muted")}>Sin stock</span>
      </span>
    );
  }

  if (mode === "options") {
    return (
      <Link
        href={product.productHref}
        aria-label={`Elegir opciones de ${product.title}`}
        onClick={(event) => event.stopPropagation()}
        className={cn(pillClassName, "bg-cta transition-colors hover:bg-cta-hover")}
      >
        <span className={cn(labelClassName, "text-cta-foreground")}>Comprar</span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Agregar ${product.title} al carrito`}
        aria-disabled={isLocked || undefined}
        onClick={handleAdd}
        className={cn(
          pillClassName,
          "bg-cta transition-colors hover:bg-cta-hover",
          isLocked ? "cursor-wait" : "cursor-pointer",
        )}
      >
        <span className={cn(labelClassName, "text-cta-foreground")}>
          {feedback ? FEEDBACK_COPY[feedback].visual : "Comprar"}
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {feedback ? FEEDBACK_COPY[feedback].spoken : ""}
      </span>
    </>
  );
}
