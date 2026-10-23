"use client";

import Image from "next/image";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SiteContainer } from "@/components/layout/site-container";
import type { CatalogProductCard } from "@/features/catalog/types";
import type { StorefrontCopy } from "@/features/storefront-copy/fields";
import {
  createArrivalStripStart,
  drawArrivalGroup,
  type ArrivalStripBag,
} from "@/features/home/arrival-strip-bag";
import {
  ADD_EVERY_MS,
  GROW_MS,
  HOLD_MS,
  WIPE_EASING,
  WIPE_MS,
  getPageVisible,
  getReducedMotion,
  subscribeToPageVisibility,
  subscribeToReducedMotion,
} from "@/features/home/strip-motion";
import { cn } from "@/lib/utils";

// Display face for this headline only; the rest of the storefront keeps
// --font-sans until a site-wide typeface is decided.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Each photo is a piece of the row: it grows to PIECE_PCT of the row width and
// the headline block gives up exactly that space. Each cycle shows a group of
// up to 4 pieces (48%) so the two-line mobile headline keeps its room.
const PIECE_PCT = 12;
const PIECES_PER_GROUP = 4;

type Phase = "build" | "cover" | "reveal";

type CycleState = {
  phase: Phase;
  count: number;
  /** Indices into `products` shown this cycle. */
  group: number[];
};

// Only what a piece needs, so any product card list (here the featured grid
// right below) can feed the strip.
type ArrivalStripProduct = Pick<
  CatalogProductCard,
  "id" | "title" | "productHref" | "images" | "imageUrl" | "imageAlt"
>;

type HomeNewInArrivalStripProps = {
  products: ArrivalStripProduct[];
  copy: StorefrontCopy["newArrivals"];
};

function PiecePhoto({ product }: { product: ArrivalStripProduct }) {
  const image = product.images[0];
  const url = image?.url ?? product.imageUrl;

  if (!url) {
    return <div className="absolute inset-0 bg-line/60" />;
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

function SupportLine({ countLabel, viewAll, className }: { countLabel: string; viewAll: string; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-muted", className)}>
      <span>{countLabel}</span>
      <span aria-hidden="true">·</span>
      <Link
        href="/productos"
        className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 transition-colors hover:text-brand hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {viewAll}
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

export function HomeNewInArrivalStrip({ products, copy }: HomeNewInArrivalStripProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const productCount = products.length;
  // Rest of the shuffle bag; only touched from timer callbacks, never render.
  const bagRef = useRef<ArrivalStripBag | null>(null);

  // Server render and no-JS show the finished composition of the first group,
  // in grid order, so server and client agree; groups are shuffled only after
  // the first red wipe. The client empties it only when the strip starts below
  // the fold, so it builds on arrival.
  const [cycle, setCycle] = useState<CycleState>(() => {
    const { group } = createArrivalStripStart(productCount, PIECES_PER_GROUP);
    return { phase: "build", count: group.length, group };
  });
  const pieces = cycle.group
    .map((index) => products[index])
    .filter((product): product is ArrivalStripProduct => Boolean(product));
  const pieceCount = pieces.length;
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
            setCycle((current) => ({ ...current, phase: "build", count: 0 }));
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
  // red band (swapping in the next group underneath), uncover, and build again
  // from zero.
  useEffect(() => {
    if (!running) {
      return;
    }

    let delay: number;
    let next: () => CycleState;

    if (cycle.phase === "build" && cycle.count < pieceCount) {
      delay = ADD_EVERY_MS;
      next = () => ({ ...cycle, count: cycle.count + 1 });
    } else if (cycle.phase === "build") {
      delay = GROW_MS + HOLD_MS;
      next = () => ({ ...cycle, phase: "cover", count: pieceCount });
    } else if (cycle.phase === "cover") {
      delay = WIPE_MS;
      // Drawn in the timer, not in render or an updater, so each wipe draws once.
      next = () => {
        const bag =
          bagRef.current ?? createArrivalStripStart(productCount, PIECES_PER_GROUP).bag;
        const drawn = drawArrivalGroup(bag, productCount, PIECES_PER_GROUP);
        bagRef.current = drawn.bag;
        return { phase: "reveal", count: 0, group: drawn.group };
      };
    } else {
      delay = WIPE_MS;
      next = () => ({ ...cycle, phase: "build", count: 0 });
    }

    const timeoutId = window.setTimeout(() => setCycle(next()), delay);
    return () => window.clearTimeout(timeoutId);
  }, [running, cycle, pieceCount, productCount]);

  if (pieceCount === 0) {
    return null;
  }

  const visibleCount = reducedMotion ? pieceCount : cycle.count;
  // While the band covers the row the reset must be instant, not animated.
  const isResetting = cycle.phase === "reveal";
  const growTransition = isResetting ? "none" : `width ${GROW_MS}ms ease`;
  // On phones the last word of the big title drops to its own line ("Lo / nuevo").
  const titleWords = copy.titleLead.split(" ");
  const titleLast = titleWords.pop() ?? "";
  const titleHead = titleWords.join(" ");

  const countLabel =
    products.length === 1 ? "1 pieza recién llegada" : `${products.length} piezas recién llegadas`;

  const bandTransform =
    cycle.phase === "cover"
      ? "translateX(0)"
      : cycle.phase === "reveal"
        ? "translateX(101%)"
        : "translateX(-101%)";
  const bandTransition =
    cycle.phase === "build" ? "none" : `transform ${WIPE_MS}ms ${WIPE_EASING}`;

  const pieceNodes: ReactNode[] = pieces.map((product, index) => {
    const isShown = index < visibleCount;

    return (
      <Link
        key={product.id}
        href={product.productHref}
        aria-label={product.title}
        aria-hidden={!isShown}
        tabIndex={isShown ? undefined : -1}
        className="relative block h-full shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        style={{ width: isShown ? `${PIECE_PCT}%` : "0%", transition: growTransition }}
      >
        {/* Inset from the right so a 0-width piece leaves no visible gap. */}
        <span className="absolute inset-y-0 left-0 right-1 overflow-hidden bg-line/60">
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
                {titleHead ? (
                  <>
                    {titleHead} <br className="lg:hidden" />
                  </>
                ) : null}
                {titleLast}
              </span>
              <span className="mt-2 block text-[1.5rem] font-medium leading-none tracking-[-0.01em] text-foreground [font-stretch:87.5%] sm:text-[2rem] lg:mt-3 lg:text-[clamp(2rem,2.7vw,2.6rem)]">
                {copy.titleTail}
              </span>
            </h2>
            <SupportLine countLabel={countLabel} viewAll={copy.viewAll} className="mt-6 hidden lg:flex" />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-promo"
            style={{ transform: bandTransform, transition: bandTransition }}
          />
        </div>

        <SupportLine countLabel={countLabel} viewAll={copy.viewAll} className="mt-4 lg:hidden" />
      </SiteContainer>
    </section>
  );
}
