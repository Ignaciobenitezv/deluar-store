"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SiteContainer } from "@/components/layout/site-container";
import { archivo } from "@/features/home/fonts";
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

// Mirror of the "Lo nuevo" arrival strip (HomeNewInArrivalStrip), with
// typographic blocks instead of photos: each benefit grows in from the RIGHT,
// pushing the previous ones to the left until the row is full; a red wipe
// crossing right to left resets it. Same timings and phases, via strip-motion.

type Phase = "build" | "cover" | "reveal";

type CycleState = {
  phase: Phase;
  count: number;
};

export type ArrivalBenefit = {
  title: string;
  text: string;
  /** The one benefit that carries the promotional red. */
  highlight?: boolean;
};

type HomeBenefitsArrivalStripProps = {
  benefits: readonly ArrivalBenefit[];
  /** Section name for assistive tech; the strip itself has no visible heading. */
  label: string;
};

export function HomeBenefitsArrivalStrip({ benefits, label }: HomeBenefitsArrivalStripProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pieceCount = benefits.length;

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

  // One timer per step: add a benefit, hold the full row, cover with the red
  // band (resetting underneath), uncover, and build again from zero.
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
  const growTransition = cycle.phase === "reveal" ? "none" : `width ${GROW_MS}ms ease`;
  const pieceWidth = `${100 / pieceCount}%`;

  // Mirrored band: waits off the right edge, covers, then leaves to the left.
  const bandTransform =
    cycle.phase === "cover"
      ? "translateX(0)"
      : cycle.phase === "reveal"
        ? "translateX(-101%)"
        : "translateX(101%)";
  const bandTransition = cycle.phase === "build" ? "none" : `transform ${WIPE_MS}ms ${WIPE_EASING}`;

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      className="py-10 sm:py-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <SiteContainer>
        {/* justify-end: each new block lands on the right edge and pushes the
            earlier ones left. The text stays in the DOM at every width, so the
            full list is always available to assistive tech. */}
        <ul
          className={cn(
            archivo.className,
            "@container relative flex h-[9rem] justify-end overflow-hidden sm:h-[11rem] lg:h-[12.5rem]",
          )}
        >
          {benefits.map((benefit, index) => {
            const isShown = index < visibleCount;

            return (
              <li
                key={benefit.title}
                className="relative h-full shrink-0 overflow-hidden"
                style={{ width: isShown ? pieceWidth : "0%", transition: growTransition }}
              >
                {/* Fixed at its final width and pinned left, so the copy never
                    reflows while the block grows: it slides in, pushed. */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 flex flex-col justify-center px-2.5 sm:px-6 lg:px-10",
                    // Plain benefits on the secondary brand surface (olive in
                    // the Actual preset), the highlighted one on promo.
                    benefit.highlight ? "bg-promo text-promo-foreground" : "bg-brand-alt text-brand-alt-foreground",
                  )}
                  style={{ width: `${100 / pieceCount}cqw` }}
                >
                  <span
                    className={cn(
                      "block whitespace-nowrap font-extrabold uppercase leading-[0.9] tracking-[-0.02em] [font-stretch:75%]",
                      benefit.highlight
                        ? "text-[clamp(1.45rem,7.8cqw,5.5rem)]"
                        : "text-[clamp(1.35rem,7.2cqw,4.5rem)]",
                    )}
                  >
                    {benefit.title}
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 block text-[clamp(0.72rem,3.2cqw,1.125rem)] font-medium leading-snug [font-stretch:87.5%] sm:mt-2.5",
                      benefit.highlight ? "text-promo-foreground/90" : "text-brand-alt-foreground/90",
                    )}
                  >
                    {benefit.text}
                  </span>
                </div>
              </li>
            );
          })}

          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-promo"
            style={{ transform: bandTransform, transition: bandTransition }}
          />
        </ul>
      </SiteContainer>
    </section>
  );
}
