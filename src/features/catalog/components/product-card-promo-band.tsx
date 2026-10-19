"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  getProductCardPurchaseMode,
  useProductCardAddToCart,
  type ProductCardCommerceData,
} from "@/features/catalog/components/product-card-commerce";
import { formatProductPrice } from "@/features/catalog/components/product-card-formatting";
import { archivo } from "@/features/home/fonts";
import { cn } from "@/lib/utils";

// The catalog card's buy control. Same idea as the home "Lo nuevo" strip:
// still compositions swapped under a horizontal wipe (transfer price, then
// discount, then COMPRAR on dark). Timing lives in CSS (.promo-band-* in
// globals.css), so every card runs on the compositor with no JS timers; JS
// only pauses bands that are off screen or in a hidden tab. The whole band is
// the action in every frame.

// Deterministic per-position offset so neighbouring cards do not flip in
// lockstep: a gentle left-to-right wave across a row.
const STAGGER_MS = 220;
const STAGGER_STEPS = 4;

// How long the added / limit / error confirmation holds the band. Also the
// lock against accidental double adds.
const FEEDBACK_MS = 1600;

// One observer and one visibility listener shared by every band on the page.
const visibilityListeners = new Map<Element, (isVisible: boolean) => void>();
let sharedObserver: IntersectionObserver | null = null;

function observeBand(element: Element, onChange: (isVisible: boolean) => void) {
  sharedObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      visibilityListeners.get(entry.target)?.(entry.isIntersecting);
    }
  });
  visibilityListeners.set(element, onChange);
  sharedObserver.observe(element);

  return () => {
    visibilityListeners.delete(element);
    sharedObserver?.unobserve(element);
  };
}

function subscribeToPageVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getPageHidden() {
  return document.visibilityState === "hidden";
}

type Feedback = "added" | "limit" | "error";

const FEEDBACK_COPY: Record<Feedback, { visual: string; spoken: string }> = {
  added: { visual: "Agregado", spoken: "Producto agregado al carrito" },
  limit: { visual: "Sin más stock", spoken: "No hay más stock disponible de este producto" },
  error: { visual: "No se pudo agregar", spoken: "No se pudo agregar el producto al carrito" },
};

type ProductCardPromoBandProps = {
  product: ProductCardCommerceData;
  /** Real transfer discount, or null: then the band is a plain buy button. */
  offer: { transferPrice: number; discountPercent: number } | null;
  /** Position in its grid; drives the deterministic stagger. */
  staggerIndex?: number;
};

export function ProductCardPromoBand({ product, offer, staggerIndex = 0 }: ProductCardPromoBandProps) {
  const bandRef = useRef<HTMLDivElement | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const pageHidden = useSyncExternalStore(subscribeToPageVisibility, getPageHidden, () => false);
  const { addToCart, isPending } = useProductCardAddToCart(product);
  const mode = getProductCardPurchaseMode(product);
  // Animated only with a real discount to show; otherwise (no discount, out of
  // stock) the band is a static dark COMPRAR / SIN STOCK.
  const isAnimated = offer !== null && mode !== "out-of-stock";

  // Off-screen pausing writes a data attribute directly: no re-render per card
  // on every scroll.
  useEffect(() => {
    const band = bandRef.current;

    if (!band || !isAnimated) {
      return;
    }

    return observeBand(band, (isVisible) => {
      band.dataset.offscreen = isVisible ? "false" : "true";
    });
  }, [isAnimated]);

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

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // Locked while the previous add is pending or still being confirmed.
    if (isPending || feedback !== null) {
      return;
    }

    try {
      const result = addToCart();
      showFeedback(result?.wasRejected || result?.wasLimited ? "limit" : "added");
    } catch {
      showFeedback("error");
    }
  };

  const formattedTransferPrice = offer ? formatProductPrice(offer.transferPrice) : null;
  const isLocked = isPending || feedback !== null;

  const visuals = (
    <span
      aria-hidden="true"
      // Colour set here, not on the control: the global `a` rule would override
      // it on the options link.
      className={cn(archivo.className, "grid px-2 py-3 text-center text-promo-foreground sm:py-3.5")}
    >
      {offer ? (
        <>
          <span
            className={cn(
              "col-start-1 row-start-1 flex flex-col items-center justify-center",
              // Out of stock keeps the price block's height, invisibly, so the
              // band matches its neighbours.
              isAnimated ? "promo-band-state-a" : "invisible",
            )}
          >
            <span className="text-[clamp(0.56rem,4.6cqw,0.72rem)] font-semibold uppercase leading-none tracking-[0.2em]">
              Transferencia
            </span>
            <span className="mt-1 whitespace-nowrap text-[clamp(1.45rem,15cqw,2.6rem)] font-extrabold leading-[0.95] tracking-[-0.02em] tabular-nums [font-stretch:87.5%]">
              {formattedTransferPrice}
            </span>
          </span>

          {isAnimated ? (
            <span className="promo-band-state-b col-start-1 row-start-1 flex items-center justify-center">
              <span className="whitespace-nowrap text-[clamp(1.6rem,16cqw,2.75rem)] font-extrabold leading-none tracking-[-0.02em] [font-stretch:87.5%]">
                -{offer.discountPercent}% OFF
              </span>
            </span>
          ) : null}
        </>
      ) : null}

      {/* COMPRAR (or SIN STOCK): its own dark layer so the band keeps the
          height of the tallest state in every frame. */}
      <span
        className={cn(
          "col-start-1 row-start-1 flex items-center justify-center",
          isAnimated && "promo-band-state-c",
        )}
      >
        <span
          className={cn(
            "whitespace-nowrap text-[clamp(1.25rem,12cqw,2rem)] font-extrabold uppercase leading-none tracking-[0.04em] [font-stretch:87.5%]",
            mode === "out-of-stock" ? "text-surface" : "text-cta-foreground",
          )}
        >
          {mode === "out-of-stock" ? "Sin stock" : "Comprar"}
        </span>
      </span>
    </span>
  );

  // COMPRAR sits on the CTA colour (it is the buy action); SIN STOCK, not
  // actionable, on ink. Static bands show this layer throughout.
  const actionBg = mode === "out-of-stock" ? "bg-foreground" : "bg-cta";
  const layers: ReactNode = (
    <>
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 -z-10", actionBg, isAnimated && "promo-band-state-c")}
      />
      {isAnimated ? (
        <span aria-hidden="true" className="promo-band-wipe pointer-events-none absolute inset-0 z-10" />
      ) : null}
      {feedback ? (
        <span
          aria-hidden="true"
          className={cn(
            archivo.className,
            "absolute inset-0 z-20 flex items-center justify-center bg-cta px-2 text-center text-cta-foreground text-[clamp(1rem,9cqw,1.5rem)] font-extrabold uppercase leading-tight tracking-[0.04em] [font-stretch:87.5%]",
          )}
        >
          {FEEDBACK_COPY[feedback].visual}
        </span>
      ) : null}
    </>
  );

  const controlClassName = cn(
    "relative isolate block w-full overflow-hidden text-promo-foreground focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white",
    isAnimated ? "bg-promo" : actionBg,
  );

  let control: ReactNode;

  if (mode === "options") {
    control = (
      <Link
        href={product.productHref}
        aria-label={`Elegir opciones de ${product.title}`}
        onClick={(event) => event.stopPropagation()}
        className={cn(controlClassName, "cursor-pointer")}
      >
        {layers}
        {visuals}
      </Link>
    );
  } else if (mode === "out-of-stock") {
    control = (
      <div role="note" aria-label={`${product.title}: sin stock`} className={cn(controlClassName, "cursor-not-allowed")}>
        {layers}
        {visuals}
      </div>
    );
  } else {
    control = (
      <button
        type="button"
        aria-label={`Agregar ${product.title} al carrito`}
        aria-disabled={isLocked || undefined}
        onClick={handleAdd}
        className={cn(controlClassName, isLocked ? "cursor-wait" : "cursor-pointer")}
      >
        {layers}
        {visuals}
      </button>
    );
  }

  return (
    <div
      ref={bandRef}
      className="promo-band @container relative"
      data-paused={pageHidden ? "true" : undefined}
      style={
        { "--promo-band-delay": `${(staggerIndex % STAGGER_STEPS) * STAGGER_MS}ms` } as CSSProperties
      }
    >
      {/* The price is always readable by assistive tech, whatever frame the
          animation is on. */}
      {offer ? (
        <p className="sr-only">
          Precio por transferencia {formattedTransferPrice}, {offer.discountPercent}% de descuento
        </p>
      ) : null}
      {control}
      <p className="sr-only" aria-live="polite">
        {feedback ? FEEDBACK_COPY[feedback].spoken : ""}
      </p>
    </div>
  );
}
