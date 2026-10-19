"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatProductPrice } from "@/features/catalog/components/product-card-formatting";
import { HomeNewInFeaturedPdp } from "@/features/home/components/home-new-in-featured-pdp";
import { archivo } from "@/features/home/fonts";
import type { HomeNewInProduct } from "@/features/home/types";
import { SiteContainer } from "@/components/layout/site-container";
import { cn } from "@/lib/utils";

const ROTATE_MS = 8000;
const WORD_RISE_MS = 600;
const PDP_FADE_MS = 500;
const NUMBER_ROLL_MS = 650;
// Each leg of the promo plate wipe over the price panel (cover, then reveal).
const PANEL_WIPE_MS = 350;
const EASE_WIPE = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function subscribeToPageVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getPageVisible() {
  return document.visibilityState === "visible";
}

// Category names come from the CMS and range from "BaÃ±o" to long promo labels.
// The category is the band's protagonist, so it gets the largest scale.
function getHeadlineSizeClass(text: string) {
  if (text.length <= 10) {
    return "text-[2.6rem] sm:text-[3.6rem] lg:text-[clamp(4.25rem,6.2vw,6.5rem)]";
  }

  if (text.length <= 20) {
    return "text-[2rem] sm:text-[2.9rem] lg:text-[clamp(3.5rem,4.8vw,5.25rem)]";
  }

  return "text-[1.55rem] sm:text-[2.1rem] lg:text-[clamp(2.4rem,3vw,3.25rem)]";
}

function formatPosition(value: number) {
  return String(value).padStart(2, "0");
}
function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

type PositionNumberProps = {
  current: number;
  previous: number | null;
  entered: boolean;
  animate: boolean;
};

// Odometer: on a product change the outgoing number rolls up and out while the
// incoming one rolls in from below, inside a one-line mask.
function PositionNumber({ current, previous, entered, animate }: PositionNumberProps) {
  const roll = (from: string, to: string) => ({
    transform: entered ? to : from,
    transition: animate && entered ? `transform ${NUMBER_ROLL_MS}ms ${EASE_WIPE}` : "none",
  });

  return (
    <span className="relative inline-block h-[0.86em] overflow-hidden align-top leading-[0.86]">
      {animate && previous !== null && previous !== current ? (
        <span className="absolute inset-x-0 top-0 block" style={roll("translateY(0)", "translateY(-105%)")}>
          {formatPosition(previous + 1)}
        </span>
      ) : null}
      <span className="block" style={roll("translateY(105%)", "translateY(0)")}>
        {formatPosition(current + 1)}
      </span>
    </span>
  );
}

// Share of the list price saved by paying by transfer, derived from the real
// prices; null when the data does not support showing a discount.
function getTransferDiscountPercent(basePrice: number, transferPrice?: number) {
  if (!transferPrice || !(basePrice > 0) || transferPrice >= basePrice) {
    return null;
  }

  const percent = Math.round((1 - transferPrice / basePrice) * 100);
  return percent >= 1 && percent < 90 ? percent : null;
}

type BandHeadlineProps = {
  product: HomeNewInProduct;
  index: number;
  previousIndex: number | null;
  count: number;
  entered: boolean;
  animate: boolean;
};

// Left side of the band: position and category. Remounted per product so the
// odometer and the word rise play on every change.
function SpotlightBandHeadline({
  product,
  index,
  previousIndex,
  count,
  entered,
  animate,
}: BandHeadlineProps) {
  const headline = product.categoryTitle || product.title;
  const words = headline.split(/\s+/).filter(Boolean);
  const showPosition = count > 1;

  return (
    <>
      {showPosition ? (
        // Secondary to the category: lighter weight, translucent, smaller.
        <p
          aria-hidden="true"
          className={cn(
            archivo.className,
            "flex shrink-0 items-start gap-1 self-start font-semibold tracking-[-0.03em] text-brand-foreground/35 [font-stretch:75%] lg:gap-1.5 lg:self-center",
          )}
        >
          <span className="text-[2.6rem] sm:text-[3.4rem] lg:text-[clamp(3.5rem,4.6vw,4.75rem)]">
            <PositionNumber
              current={index}
              previous={previousIndex}
              entered={entered}
              animate={animate}
            />
          </span>
          <span className="mt-1 text-xs font-medium tracking-[0.02em] text-brand-foreground/60 [font-stretch:100%] sm:text-sm lg:mt-1.5">
            /{formatPosition(count)}
          </span>
        </p>
      ) : null}

      <p
        className={cn(
          archivo.className,
          getHeadlineSizeClass(headline),
          "min-w-0 font-extrabold leading-[0.86] tracking-[-0.03em] text-brand-foreground [font-stretch:75%] [overflow-wrap:anywhere]",
        )}
      >
        {words.map((word, wordIndex) => (
          <span key={`${word}-${wordIndex}`}>
            <span className="inline-block overflow-hidden pb-[0.06em] align-bottom">
              <span
                className="inline-block"
                style={{
                  transform: entered ? "translateY(0)" : "translateY(110%)",
                  transition:
                    animate && entered
                      ? `transform ${WORD_RISE_MS}ms ${EASE_OUT} ${180 + wordIndex * 45}ms`
                      : "none",
                }}
              >
                {word}
              </span>
            </span>
            {wordIndex < words.length - 1 ? " " : null}
          </span>
        ))}
      </p>
    </>
  );
}

type PricePanelPhase = "idle" | "cover" | "reveal";

type PricePanelProps = {
  product: HomeNewInProduct;
  nextProduct: HomeNewInProduct | null;
  animate: boolean;
  onNext: () => void;
};

// Right side of the band, on a cream panel (promo red is illegible on the
// band's brown: 1.3:1 vs 5.8:1 on cream). On a product change a solid promo
// plate wipes across it, the same cover â†’ swap â†’ reveal mechanic as the
// "Lo nuevo" strip: the content is swapped only while fully covered.
function SpotlightPricePanel({ product, nextProduct, animate, onNext }: PricePanelProps) {
  const [shown, setShown] = useState({ product, nextProduct });
  const [trackedId, setTrackedId] = useState(product.id);
  const [phase, setPhase] = useState<PricePanelPhase>("idle");

  // Adjust state while rendering when the active product changes, so the
  // plate starts covering in the same commit as the band's other motion.
  if (product.id !== trackedId) {
    setTrackedId(product.id);

    if (animate) {
      setPhase("cover");
    } else {
      setShown({ product, nextProduct });
    }
  }

  useEffect(() => {
    if (phase === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (phase === "cover") {
        setShown({ product, nextProduct });
        setPhase("reveal");
      } else {
        setPhase("idle");
      }
    }, PANEL_WIPE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [phase, product, nextProduct]);

  const shownProduct = shown.product;
  const transferPrice = shownProduct.transferPrice;
  const discountPercent = getTransferDiscountPercent(shownProduct.basePrice, transferPrice);
  const listPrice = `${shownProduct.pricePrefix ? `${shownProduct.pricePrefix} ` : ""}${formatProductPrice(shownProduct.basePrice)}`;
  const plateTransform =
    phase === "cover" ? "translateX(0)" : phase === "reveal" ? "translateX(101%)" : "translateX(-101%)";

  return (
    <div className="relative min-w-0 overflow-hidden bg-canvas lg:w-[25rem] lg:shrink-0 xl:w-[28rem]">
      <div className="flex h-full min-w-0 flex-col justify-center gap-1 py-3 pl-5 pr-5 sm:pl-8 sm:pr-8 lg:gap-1.5 lg:py-4 lg:pl-8 lg:pr-12">
        <p className="truncate text-[13px] leading-snug text-foreground/70 lg:text-sm">
          {shownProduct.title}
        </p>

        {transferPrice ? (
          <>
            <p
              className={cn(
                archivo.className,
                "text-[2.4rem] font-extrabold leading-[0.9] tracking-[-0.025em] text-promo tabular-nums [font-stretch:87.5%] sm:text-[2.75rem] lg:text-[clamp(2.75rem,3.5vw,3.6rem)]",
              )}
            >
              {formatProductPrice(transferPrice)}
            </p>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-[13px] font-semibold text-promo lg:text-sm">con transferencia</span>
              {discountPercent ? (
                <span className="rounded-full bg-promo px-2 py-1 text-[11px] font-bold leading-none tracking-[0.04em] text-promo-foreground lg:text-xs">
                  {discountPercent}% OFF
                </span>
              ) : null}
            </p>
            <p className="text-[13px] text-ink-muted">
              Precio de lista <span className="tabular-nums">{listPrice}</span>
            </p>
          </>
        ) : (
          <p
            className={cn(
              archivo.className,
              "text-[2.4rem] font-extrabold leading-[0.9] tracking-[-0.025em] text-foreground tabular-nums [font-stretch:87.5%] lg:text-[clamp(2.75rem,3.5vw,3.6rem)]",
            )}
          >
            {listPrice}
          </p>
        )}

        {shown.nextProduct ? (
          // Moves the spotlight forward; it never navigates away.
          <button
            type="button"
            onClick={onNext}
            className="group mt-1 hidden min-w-0 max-w-full items-center gap-2 self-start text-left text-[13px] text-foreground/60 transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:inline-flex"
          >
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em]">Sigue</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
            <span className="truncate">{shown.nextProduct.title}</span>
          </button>
        ) : null}
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-promo"
        style={{
          transform: plateTransform,
          transition: phase === "idle" ? "none" : `transform ${PANEL_WIPE_MS}ms ${EASE_WIPE}`,
        }}
      />
    </div>
  );
}
type HomeProductSpotlightProps = {
  products: HomeNewInProduct[];
  label: string;
};

type SpotlightState = {
  index: number;
  /** Outgoing position, so the odometer can roll it out. */
  previous: number | null;
  entered: boolean;
};

export function HomeProductSpotlight({ products, label }: HomeProductSpotlightProps) {
  const bandRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);
  // The single source of truth for band + presentation. Server render starts
  // entered so the first product needs no client motion to be visible.
  const [state, setState] = useState<SpotlightState>({ index: 0, previous: null, entered: true });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => false);
  const pageVisible = useSyncExternalStore(subscribeToPageVisibility, getPageVisible, () => true);

  const count = products.length;
  const animate = !reducedMotion;
  const rotating = animate && count > 1 && inView && pageVisible && !hovered && !focused;

  const goTo = useCallback(
    (target: number) => {
      setState((current) => {
        const next = (target + count) % count;
        return next === current.index
          ? current
          : { index: next, previous: current.index, entered: !animate };
      });

      if (animate) {
        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
        }
        // Two frames: commit the hidden start state, then transition from it.
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = window.requestAnimationFrame(() => {
            setState((current) => ({ ...current, entered: true }));
          });
        });
      }
    },
    [animate, count],
  );

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  // Rotation follows the band, not the whole block: once someone scrolls down
  // into the presentation to read it, the product must not change under them.
  useEffect(() => {
    const band = bandRef.current;

    if (!band) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.6,
    });
    observer.observe(band);

    return () => observer.disconnect();
  }, []);

  // One timer for the whole block; restarting on index change also resets it
  // after manual navigation.
  useEffect(() => {
    if (!rotating) {
      return;
    }

    const timeoutId = window.setTimeout(() => goTo(state.index + 1), ROTATE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [rotating, goTo, state.index]);

  // The red line is the rotation timer made visible: it runs exactly while the
  // 8 s timeout runs and restarts with it (manual change, or resuming a pause).
  useEffect(() => {
    const progress = progressRef.current;

    if (!progress || !rotating) {
      return;
    }

    const animation = progress.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: ROTATE_MS,
      easing: "linear",
      fill: "forwards",
    });

    return () => animation.cancel();
  }, [rotating, state.index]);

  if (count === 0) {
    return null;
  }

  const activeIndex = Math.min(state.index, count - 1);
  const activeProduct = products[activeIndex];
  const nextProduct = count > 1 ? products[(activeIndex + 1) % count] : null;

  return (
    <section
      aria-label={label}
      aria-roledescription="carrusel"
      className="pb-12 sm:pb-16"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <div ref={bandRef} className="relative bg-brand">
        <div className="flex flex-col lg:h-[12rem] lg:flex-row">
          <div
            key={activeProduct.id}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-4 py-4 sm:gap-7 sm:py-5 lg:gap-10 lg:py-6 lg:pl-16 lg:pr-10",
              // Room for the side arrows on phones and tablets.
              count > 1 ? "px-12 sm:px-14" : "px-5 sm:px-8",
            )}
          >
            <SpotlightBandHeadline
              product={activeProduct}
              index={activeIndex}
              previousIndex={state.previous}
              count={count}
              entered={state.entered}
              animate={animate}
            />
          </div>

          <SpotlightPricePanel
            product={activeProduct}
            nextProduct={nextProduct}
            animate={animate}
            onNext={() => goTo(activeIndex + 1)}
          />
        </div>

        {count > 1 ? (
          <>
            <p className="sr-only" aria-live={rotating ? "off" : "polite"}>
              Producto {activeIndex + 1} de {count}: {activeProduct.title}
            </p>
            {/* Side arrows: quiet chevrons with a full touch target, no circles.
                On phones both sit on the brown headline row; on desktop the
                right one sits on the cream panel. */}
            <button
              type="button"
              aria-label="Producto anterior"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-0 top-3 z-20 inline-flex h-12 w-11 items-center justify-center text-brand-foreground/55 transition-colors hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-foreground sm:top-4 lg:left-2 lg:top-1/2 lg:-translate-y-1/2"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              aria-label="Producto siguiente"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-0 top-3 z-20 inline-flex h-12 w-11 items-center justify-center text-brand-foreground/55 transition-colors hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current sm:top-4 lg:right-1 lg:top-1/2 lg:-translate-y-1/2 lg:text-foreground/45 lg:hover:text-foreground"
            >
              <ChevronIcon direction="right" />
            </button>
            {animate ? (
              // The rotation timer made visible, on the band's bottom edge
              // without reserving height.
              <span
                ref={progressRef}
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 z-20 block h-[3px] origin-left bg-promo"
                style={{ transform: "scaleX(0)" }}
              />
            ) : null}
          </>
        ) : null}
      </div>
      <SiteContainer className="pt-6 sm:pt-8 lg:pt-10">
        <div
          style={{
            opacity: state.entered ? 1 : 0,
            transform: state.entered ? "translateY(0)" : "translateY(12px)",
            transition:
              animate && state.entered
                ? `opacity ${PDP_FADE_MS}ms ${EASE_OUT} 150ms, transform ${PDP_FADE_MS}ms ${EASE_OUT} 150ms`
                : "none",
          }}
        >
          <HomeNewInFeaturedPdp product={activeProduct} />
        </div>
      </SiteContainer>
    </section>
  );
}
