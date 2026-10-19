"use client";

import Image from "next/image";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatProductPrice } from "@/features/catalog/components/product-card-formatting";
import { calculateTransferPrice } from "@/features/pricing/commercial-pricing";
import type { HomeHeroProduct, HomeHeroSlide, HomeHeroSurface } from "@/features/home/types";
import { cn } from "@/lib/utils";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const AUTOPLAY_MS = 7000;
const PANEL_WIPE_MS = 650;
const WORD_RISE_MS = 700;
const PRODUCT_WIPE_MS = 750;
const KEN_BURNS_MS = 7000;
const EASE_WIPE = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

type SurfaceStyle = {
  panel: string;
  title: string;
  body: string;
  tag: string;
  cta: string;
  ctaText: string;
  link: string;
  control: string;
  bar: string;
  barIdle: string;
};

// Every surface is a solved contrast pairing; a future admin picks the name.
// Panels must be OPAQUE: the previous slide stays mounted underneath (for the
// wipe) and a translucent panel lets its colour, title and CTAs show through.
const SURFACES: Record<HomeHeroSurface, SurfaceStyle> = {
  promo: {
    panel: "bg-promo",
    title: "text-promo-foreground",
    body: "text-promo-foreground/90",
    tag: "bg-promo-foreground text-promo",
    cta: "bg-promo-foreground hover:bg-surface-raised",
    ctaText: "text-ink",
    link: "text-promo-foreground",
    control: "border-promo-foreground/45 text-promo-foreground hover:bg-promo-foreground/12",
    bar: "bg-promo-foreground",
    barIdle: "bg-promo-foreground/35",
  },
  sand: {
    panel: "bg-canvas-alt",
    title: "text-promo",
    body: "text-foreground/85",
    tag: "bg-promo text-promo-foreground",
    cta: "bg-cta hover:bg-cta-hover",
    ctaText: "text-cta-foreground",
    link: "text-foreground",
    control: "border-foreground/25 text-foreground hover:bg-foreground/[0.06]",
    bar: "bg-foreground",
    barIdle: "bg-foreground/25",
  },
  // Brand surface: the panel takes the brand colour; its CTA is the inverted
  // light button (brand-foreground fill, ink text), not the primary CTA token.
  brown: {
    panel: "bg-brand",
    title: "text-brand-foreground",
    body: "text-brand-foreground/85",
    tag: "bg-promo text-promo-foreground",
    cta: "bg-brand-foreground hover:bg-surface-raised",
    ctaText: "text-ink",
    link: "text-brand-foreground",
    control: "border-brand-foreground/40 text-brand-foreground hover:bg-brand-foreground/10",
    bar: "bg-brand-foreground",
    barIdle: "bg-brand-foreground/35",
  },
};

// Titles come from the CMS (up to 140 chars): scale by length so a short word
// lands as a poster and a long sentence still fits the panel.
function getTitleSizeClass(title: string) {
  if (title.length <= 14) {
    return "text-[4rem] sm:text-[5.5rem] lg:text-[clamp(5.5rem,9vw,9.5rem)]";
  }

  if (title.length <= 28) {
    return "text-[3.25rem] sm:text-[4.5rem] lg:text-[clamp(5rem,7.9vw,8.75rem)]";
  }

  return "text-[2.25rem] sm:text-[3rem] lg:text-[clamp(3rem,4.2vw,4.5rem)]";
}

function isBrandOnlyEyebrow(eyebrow: string) {
  return eyebrow.trim().toLowerCase() === "deluar";
}

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

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
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

type RevealProps = {
  entered: boolean;
  animate: boolean;
  delay: number;
};

function riseStyle({ entered, animate, delay }: RevealProps) {
  return {
    opacity: entered ? 1 : 0,
    transform: entered ? "translateY(0)" : "translateY(10px)",
    transition: animate && entered
      ? `opacity 500ms ${EASE_OUT} ${delay}ms, transform 500ms ${EASE_OUT} ${delay}ms`
      : "none",
  };
}

type SlidePanelProps = {
  slide: HomeHeroSlide;
  isCurrent: boolean;
  entered: boolean;
  animate: boolean;
};

function SlidePanel({ slide, isCurrent, entered, animate }: SlidePanelProps) {
  const surface = SURFACES[slide.surface ?? "sand"];
  const words = slide.title.split(/\s+/).filter(Boolean);
  const TitleTag = isCurrent ? "h1" : "p";
  const showTag = Boolean(slide.eyebrow) && !isBrandOnlyEyebrow(slide.eyebrow);

  return (
    // Colour lives on the panel: the global `a { color: inherit }` rule is
    // unlayered and beats utility colours set directly on links.
    <div className={cn("flex h-full flex-col", surface.panel, surface.link)}>
      <TitleTag
        className={cn(
          archivo.className,
          getTitleSizeClass(slide.title),
          "font-extrabold leading-[0.86] tracking-[-0.03em] [font-stretch:75%] [text-wrap:balance]",
          surface.title,
        )}
      >
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>
            <span className="inline-block overflow-hidden pb-[0.06em] align-bottom">
              <span
                className="inline-block"
                style={{
                  transform: entered ? "translateY(0)" : "translateY(110%)",
                  transition:
                    animate && entered
                      ? `transform ${WORD_RISE_MS}ms ${EASE_OUT} ${220 + index * 45}ms`
                      : "none",
                }}
              >
                {word}
              </span>
            </span>
            {index < words.length - 1 ? " " : null}
          </span>
        ))}
      </TitleTag>

      <div className="mt-6 sm:mt-8 lg:mt-auto lg:pt-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {showTag ? (
            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold uppercase leading-none tracking-[0.06em]",
                surface.tag,
              )}
              style={riseStyle({ entered, animate, delay: 420 })}
            >
              {slide.eyebrow}
            </span>
          ) : null}
          {slide.text ? (
            <p
              className={cn("max-w-[34rem] text-base leading-snug sm:text-lg lg:text-[1.2rem]", surface.body)}
              style={riseStyle({ entered, animate, delay: 470 })}
            >
              {slide.text}
            </p>
          ) : null}
        </div>
  
        <div
          className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-7 lg:mt-8"
          style={riseStyle({ entered, animate, delay: 540 })}
        >
          <Link
            href={slide.ctaHref || "/productos"}
            tabIndex={isCurrent ? undefined : -1}
            className={cn(
              "inline-flex h-12 items-center justify-center rounded-[10px] px-7 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 lg:h-14 lg:px-8 lg:text-base",
              surface.cta,
            )}
          >
            <span className={surface.ctaText}>{slide.ctaLabel || "Ver productos"}</span>
          </Link>
          {slide.secondaryCtaLabel && slide.secondaryCtaHref ? (
            <Link
              href={slide.secondaryCtaHref}
              tabIndex={isCurrent ? undefined : -1}
              className={cn(
                "inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current lg:text-base",
              )}
            >
              {slide.secondaryCtaLabel}
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ProductPieceProps = {
  product: HomeHeroProduct | undefined;
  isCurrent: boolean;
  entered: boolean;
  animate: boolean;
  order: number;
};

function ProductPiece({ product, isCurrent, entered, animate, order }: ProductPieceProps) {
  if (!product) {
    return <div className="absolute inset-0 bg-canvas-alt" />;
  }

  const transferPrice = calculateTransferPrice(product.basePrice);
  const wipeDelay = 120 + order * 120;
  const plateDelay = 620 + order * 120;

  return (
    <Link
      href={product.href}
      tabIndex={isCurrent ? undefined : -1}
      aria-hidden={isCurrent ? undefined : true}
      className="group absolute inset-0 block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
      style={{
        clipPath: entered ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
        transition:
          animate && entered ? `clip-path ${PRODUCT_WIPE_MS}ms ${EASE_WIPE} ${wipeDelay}ms` : "none",
      }}
    >
      <span className="absolute inset-0 bg-canvas-alt">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1024px) 42vw, 50vw"
            className="object-cover"
            style={{
              objectPosition: product.imageObjectPosition,
              transform: entered && animate ? "scale(1)" : animate ? "scale(1.06)" : "scale(1)",
              transition: animate && entered ? `transform ${KEN_BURNS_MS}ms ${EASE_OUT}` : "none",
            }}
          />
        ) : null}
      </span>

      <span
        className="absolute bottom-2.5 left-2.5 right-2.5 block rounded-[10px] bg-surface px-3 py-2.5 shadow-[0_10px_28px_color-mix(in_srgb,var(--ink)_16%,transparent)] sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[min(22rem,calc(100%-2rem))] lg:bottom-5 lg:left-5 lg:px-4 lg:py-3.5"
        style={riseStyle({ entered, animate, delay: plateDelay })}
      >
        <span className="block truncate text-[13px] font-medium leading-tight text-foreground lg:text-[15px]">
          {product.title}
        </span>
        <span className="mt-1.5 block text-[15px] font-extrabold leading-none tabular-nums text-ink lg:mt-2 lg:text-[1.35rem]">
          {product.pricePrefix ? `${product.pricePrefix} ` : null}
          {formatProductPrice(product.basePrice)}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-promo lg:mt-2">
          <span className="text-[14px] font-extrabold leading-none tabular-nums lg:text-[1.1rem]">
            {formatProductPrice(transferPrice)}
          </span>
          <span className="hidden rounded-full bg-promo px-2 py-1 text-xs font-bold leading-none tracking-[0.04em] text-promo-foreground sm:inline-block">
            20% OFF
          </span>
          <span className="text-xs font-semibold leading-none">
            <span className="sm:hidden">con transf.</span>
            <span className="hidden sm:inline">con transferencia</span>
          </span>
        </span>
      </span>
    </Link>
  );
}

type HomeHeroSliderProps = {
  slides: HomeHeroSlide[];
};

type SlideState = {
  index: number;
  previous: number | null;
  entered: boolean;
};

export function HomeHeroSlider({ slides }: HomeHeroSliderProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  // Server render shows the first slide fully composed (entered); entrance
  // motion only plays on client-side slide changes.
  const [state, setState] = useState<SlideState>({ index: 0, previous: null, entered: true });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => false);
  const pageVisible = useSyncExternalStore(subscribeToPageVisibility, getPageVisible, () => true);

  const slideCount = slides.length;
  const animate = !reducedMotion;
  const autoplay = animate && slideCount > 1 && inView && pageVisible && !hovered && !focused;

  const goTo = useCallback(
    (target: number) => {
      setState((current) => {
        const next = (target + slideCount) % slideCount;
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
    [animate, slideCount],
  );

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  // Restarting on every index change also resets the timer after manual navigation.
  useEffect(() => {
    if (!autoplay) {
      return;
    }

    const timeoutId = window.setTimeout(() => goTo(state.index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [autoplay, goTo, state.index]);

  if (slideCount === 0) {
    return null;
  }

  const current = slides[state.index];
  const previous = state.previous !== null ? slides[state.previous] : null;
  const surface = SURFACES[current.surface ?? "sand"];
  const panelWipe = {
    clipPath: state.entered ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
    transition:
      animate && state.entered ? `clip-path ${PANEL_WIPE_MS}ms ${EASE_WIPE}` : "none",
  };

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carrusel"
      aria-label="Destacados de Deluar"
      className="grid gap-1 border-b border-border/70 bg-background lg:h-[calc(100svh-11.5rem)] lg:min-h-[34rem] lg:max-h-[52rem] lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <div className="relative overflow-hidden">
        {previous ? (
          <div aria-hidden="true" className="absolute inset-0 px-5 pb-6 pt-8 sm:px-10 sm:pb-8 sm:pt-12 lg:px-14 lg:pb-12 lg:pt-14 xl:px-20">
            <div className={cn("absolute inset-0", SURFACES[previous.surface ?? "sand"].panel)} />
            <div className="relative h-full">
              <SlidePanel slide={previous} isCurrent={false} entered animate={false} />
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "relative flex h-full flex-col px-5 pb-6 pt-8 sm:px-10 sm:pb-8 sm:pt-12 lg:px-14 lg:pb-12 lg:pt-14 xl:px-20",
            surface.panel,
          )}
          style={panelWipe}
          aria-live={autoplay ? "off" : "polite"}
        >
          <div className="flex-1">
            <SlidePanel
              key={current.id}
              slide={current}
              isCurrent
              entered={state.entered}
              animate={animate}
            />
          </div>

          {slideCount > 1 ? (
            <div className="mt-8 flex items-center gap-4 lg:mt-10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diapositiva anterior"
                  onClick={() => goTo(state.index - 1)}
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
                    surface.control,
                  )}
                >
                  <ChevronIcon direction="left" />
                </button>
                <button
                  type="button"
                  aria-label="Diapositiva siguiente"
                  onClick={() => goTo(state.index + 1)}
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
                    surface.control,
                  )}
                >
                  <ChevronIcon direction="right" />
                </button>
              </div>
              <div className="flex items-center">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Ir a la diapositiva ${index + 1} de ${slideCount}`}
                    aria-current={index === state.index ? "true" : undefined}
                    onClick={() => goTo(index)}
                    className="group flex h-11 items-center px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                  >
                    <span
                      className={cn(
                        "block h-[3px] rounded-full transition-all duration-300",
                        index === state.index ? cn("w-10", surface.bar) : cn("w-5", surface.barIdle),
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 lg:grid-cols-1 lg:grid-rows-2">
        {[0, 1].map((slot) => (
          <div key={slot} className="relative aspect-[4/5] overflow-hidden lg:aspect-auto">
            {previous ? (
              <div aria-hidden="true" className="absolute inset-0">
                <ProductPiece
                  product={previous.products?.[slot]}
                  isCurrent={false}
                  entered
                  animate={false}
                  order={slot}
                />
              </div>
            ) : null}
            <ProductPiece
              key={`${current.id}-${slot}`}
              product={current.products?.[slot]}
              isCurrent
              entered={state.entered}
              animate={animate}
              order={slot}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
