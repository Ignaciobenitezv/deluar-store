import type { CSSProperties } from "react";
import { DEFAULT_IMAGE_FRAMING, IMAGE_FRAMING_MAX_ZOOM, type ImageFraming } from "./fields";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Untrusted framing to a valid one, or null when it is not one. Values are clamped and rounded. */
export function parseImageFraming(value: unknown): ImageFraming | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const { x, y, zoom } = value as Record<string, unknown>;

  if (![x, y, zoom].every((part) => typeof part === "number" && Number.isFinite(part))) {
    return null;
  }

  const round = (part: number) => Math.round(part * 1000) / 1000;

  return {
    x: round(clamp(x as number, 0, 1)),
    y: round(clamp(y as number, 0, 1)),
    zoom: round(clamp(zoom as number, 1, IMAGE_FRAMING_MAX_ZOOM)),
  };
}

export function isDefaultFraming(framing: ImageFraming | undefined | null) {
  return (
    !framing ||
    (framing.x === DEFAULT_IMAGE_FRAMING.x && framing.y === DEFAULT_IMAGE_FRAMING.y && framing.zoom === DEFAULT_IMAGE_FRAMING.zoom)
  );
}

/**
 * Style for an `object-fit: cover` image (next/image fill, <img>) inside an
 * overflow-hidden frame: the focus point stays in view and the zoom grows
 * around it. The same function paints the store, the previews and the editor,
 * so what Lucila sets is what the store shows.
 */
export function framingStyle(framing: ImageFraming | undefined | null): CSSProperties {
  if (isDefaultFraming(framing)) {
    return {};
  }

  const { x, y, zoom } = framing as ImageFraming;
  const origin = `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`;

  return {
    objectPosition: origin,
    ...(zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: origin } : {}),
  };
}
