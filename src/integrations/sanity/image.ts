import { createImageUrlBuilder } from "@sanity/image-url";
import type { SanityImageWithAlt } from "@/types/cms";
import { sanityConfig } from "@/integrations/sanity/config";

const builder = createImageUrlBuilder({
  projectId: sanityConfig.projectId,
  dataset: sanityConfig.dataset,
});

/** The single real Sanity asset the Tiendanube bulk import attached to every
 * product it migrated without a real photo yet (a generic "Imagen
 * pendiente" graphic — not a broken/missing reference). Shared here so
 * "is this a real photo" has exactly one definition across the storefront's
 * representative-image pick, the admin catalog filter, and the admin list's
 * thumbnail selection. */
export const TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF = "image-6b2cf67d136ed1727e2c54e0988ed6a3e75cc8cd-1200x1500-png";

export function getSanityImageUrl(
  source?: SanityImageWithAlt,
  width = 900,
  height = 1120,
  fit: "crop" | "max" = "crop",
) {
  if (!source?.image?.asset?._ref || !sanityConfig.projectId || !sanityConfig.dataset) {
    return null;
  }

  return builder.image(source.image).width(width).height(height).fit(fit).auto("format").url();
}

/**
 * Manual encuadre (Ajustar encuadre) is stored as Sanity's native
 * `image.hotspot` — never a custom positionX/positionY. This is the single
 * place that turns that normalized (0–1) hotspot into a CSS `object-position`
 * value, so every consumer (catalog cards, PDP gallery, the admin's own
 * preview) agrees on the same crop for the same image regardless of the
 * aspect ratio it's displayed at. No hotspot (the default for every image
 * that was never adjusted) falls back to "50% 50%" — the exact centering
 * behavior every image already had.
 */
export function getSanityImageObjectPosition(source?: SanityImageWithAlt | null): string {
  const hotspot = source?.image?.hotspot;

  if (!hotspot || typeof hotspot.x !== "number" || typeof hotspot.y !== "number") {
    return "50% 50%";
  }

  const x = Math.min(1, Math.max(0, hotspot.x));
  const y = Math.min(1, Math.max(0, hotspot.y));

  return `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`;
}
