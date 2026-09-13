"use client";

import { useCallback, useRef } from "react";

/**
 * A light that follows the pointer across the surfaces underneath it. Each card
 * receives the cursor in its own coordinates, so a card the pointer is nowhere
 * near simply places the light outside its box and shows nothing — the glow
 * falls off across neighbours on its own, with no hit-testing.
 *
 * Only two custom properties are written per frame; no React state, so nothing
 * re-renders while the pointer moves.
 */
export function SpotlightArea({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const handleMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const { clientX, clientY } = event;

    if (frame.current) {
      return;
    }

    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      const targets = ref.current?.querySelectorAll<HTMLElement>("[data-spotlight]");

      targets?.forEach((element) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--mx", `${clientX - rect.left}px`);
        element.style.setProperty("--my", `${clientY - rect.top}px`);
      });
    });
  }, []);

  const handleLeave = useCallback(() => {
    const targets = ref.current?.querySelectorAll<HTMLElement>("[data-spotlight]");

    targets?.forEach((element) => {
      element.style.removeProperty("--mx");
      element.style.removeProperty("--my");
    });
  }, []);

  return (
    <div ref={ref} className={className} onPointerMove={handleMove} onPointerLeave={handleLeave}>
      {children}
    </div>
  );
}
