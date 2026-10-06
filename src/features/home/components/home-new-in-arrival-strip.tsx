"use client";

import Image from "next/image";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SiteContainer } from "@/components/layout/site-container";
import type { HomeNewInProduct } from "@/features/home/types";
import { cn } from "@/lib/utils";

// Display face for this headline only; the rest of the storefront keeps
// --font-sans until a site-wide typeface is decided.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Each photo is a piece of the row: it grows to PIECE_PCT of the row width and
// the headline block gives up exactly that space. Desktop caps at 5 pieces
// (60%), mobile at 4 (48%) so the two-line headline keeps its room.
const PIECE_PCT = 12;
const MAX_PIECES_DESKTOP = 5;
const MAX_PIECES_MOBILE = 4;

const ADD_EVERY_MS = 350;
const GROW_MS = 300;
const HOLD_MS = 900;
const WIPE_MS = 280;

type Phase = "build" | "cover" | "reveal";

type CycleState = {
  phase: Phase;
  count: number;
};

type HomeNewInArrivalStripProps = {
  products: HomeNewInProduct[];
};

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

function PiecePhoto({ product }: { product: HomeNewInProduct }) {
  const image = product.images[0];
  const url = image?.url ?? product.imageUrl;

  if (!url) {
    return <div className="absolute inset-0 bg-[#efe6da]" />;
  }

  return (
    <Image
      src={url}
      alt={image?.alt || product.imageAlt || product.title}
      fill
      sizes="(min-width: 1024px) 12vw, 14vw"
      className="object-cover"
      style={{ objectPosition: image?.objectPosition }}
    />
  );
}

function SupportLine({ countLabel, className }: { countLabel: string; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-muted", className)}>
      <span>{countLabel}</span>
      <span aria-hidden="true">·</span>
      <Link
        href="/productos"
        className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 transition-colors hover:text-[var(--color-accent-strong)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
      >
        Ver todo
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
    </p>
  );
}

export function HomeNewInArrivalStrip({ products }: HomeNewInArrivalStripProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pieces = products.slice(0, MAX_PIECES_DESKTOP);
  const pieceCount = pieces.length;

  // Server render and no-JS show the finished composition; the client empties
  // it only when the strip starts below the fold, so it builds on arrival.
  const [cycle, setCycle] = useState<CycleState>({ phase: "build", count: pieceCount });
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => false);
  const pageVisible = useSyncExternalStore(subscribeToPageVisibility, getPageVisible, () => true);

  const animated = !reducedMotion && pieceCount > 0;
  const running = animated && inView && pageVisible && !paused;

  useEffect(() => {
    const section = sectionRef.current;

    if (!animated || !section) {
      return;
    }

    let isFirstEntry = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (isFirstEntry) {
          isFirstEntry = false;

          if (!entry.isIntersecting) {
            setCycle({ phase: "build", count: 0 });
          }
        }

        setInView(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, [animated]);

  // One timer per step: add a piece, hold the full composition, cover with the
  // red band (resetting underneath), uncover, and build again from zero.
  useEffect(() => {
    if (!running) {
      return;
    }

    let delay: number;
    let next: CycleState;

    if (cycle.phase === "build" && cycle.count < pieceCount) {
      delay = ADD_EVERY_MS;
      next = { phase: "build", count: cycle.count + 1 };
    } else if (cycle.phase === "build") {
      delay = GROW_MS + HOLD_MS;
      next = { phase: "cover", count: pieceCount };
    } else if (cycle.phase === "cover") {
      delay = WIPE_MS;
      next = { phase: "reveal", count: 0 };
    } else {
      delay = WIPE_MS;
      next = { phase: "build", count: 0 };
    }

    const timeoutId = window.setTimeout(() => setCycle(next), delay);
    return () => window.clearTimeout(timeoutId);
  }, [running, cycle, pieceCount]);

  if (pieceCount === 0) {
    return null;
  }

  const visibleCount = reducedMotion ? pieceCount : cycle.count;
  // While the band covers the row the reset must be instant, not animated.
  const isResetting = cycle.phase === "reveal";
  const growTransition = isResetting ? "none" : `width ${GROW_MS}ms ease`;
  const countLabel =
    products.length === 1 ? "1 pieza recién llegada" : `${products.length} piezas recién llegadas`;

  const bandTransform =
    cycle.phase === "cover"
      ? "translateX(0)"
      : cycle.phase === "reveal"
        ? "translateX(101%)"
        : "translateX(-101%)";
  const bandTransition =
    cycle.phase === "build" ? "none" : `transform ${WIPE_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`;

  const pieceNodes: ReactNode[] = pieces.map((product, index) => {
    const isShown = index < visibleCount;

    return (
      <Link
        key={product.id}
        href={product.productHref}
        aria-label={product.title}
        aria-hidden={!isShown}
        tabIndex={isShown ? undefined : -1}
        className={cn(
          "relative block h-full shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
          index >= MAX_PIECES_MOBILE && "max-lg:hidden",
        )}
        style={{ width: isShown ? `${PIECE_PCT}%` : "0%", transition: growTransition }}
      >
        {/* Inset from the right so a 0-width piece leaves no visible gap. */}
        <span className="absolute inset-y-0 left-0 right-1 overflow-hidden bg-[#efe6da]">
          <PiecePhoto product={product} />
        </span>
      </Link>
    );
  });

  return (
    <section
      ref={sectionRef}
      aria-labelledby="home-new-in-arrival-title"
      className="py-10 sm:py-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <SiteContainer>
        <div className="relative flex h-[13.5rem] overflow-hidden sm:h-[16rem] lg:h-[17.5rem]">
          {pieceNodes}

          {/* flex-1: the headline block yields whatever width the pieces take,
              so it is pushed right as each photo grows in. */}
          <div className="flex min-w-0 flex-1 flex-col justify-end pl-3 sm:pl-6 lg:pl-12">
            <h2
              id="home-new-in-arrival-title"
              className={cn(archivo.className, "whitespace-nowrap text-promo")}
            >
              <span className="block text-[clamp(3.25rem,15vw,4.25rem)] font-extrabold leading-[0.82] tracking-[-0.03em] [font-stretch:75%] sm:text-[5.5rem] lg:text-[clamp(5.5rem,7.4vw,8rem)]">
                Lo <br className="lg:hidden" />
                nuevo
              </span>
              <span className="mt-2 block text-[1.5rem] font-medium leading-none tracking-[-0.01em] text-foreground [font-stretch:87.5%] sm:text-[2rem] lg:mt-3 lg:text-[clamp(2rem,2.7vw,2.6rem)]">
                en Deluar
              </span>
            </h2>
            <SupportLine countLabel={countLabel} className="mt-6 hidden lg:flex" />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-promo"
            style={{ transform: bandTransform, transition: bandTransition }}
          />
        </div>

        <SupportLine countLabel={countLabel} className="mt-4 lg:hidden" />
      </SiteContainer>
    </section>
  );
}
