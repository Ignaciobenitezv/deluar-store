import type { HomeHeroProduct, HomeHeroSlide } from "@/features/home/types";
import type { StorefrontCopy } from "./fields";
import { applyHeroOverrides } from "./storefront-copy-document";

type ImageUrlsFor = (assetRef: string) => { imageUrl: string | null; mobileImageUrl: string | null };

/** A slide created in the admin starts from nothing but the hero's own defaults. */
function blankSlide(id: string): HomeHeroSlide {
  return {
    id,
    eyebrow: "",
    title: "",
    text: "",
    imageUrl: null,
    mobileImageUrl: null,
    imageAlt: "",
    ctaLabel: "Ver productos",
    ctaHref: "/productos",
    surface: "promo",
  };
}

/**
 * The hero as the admin set it: Studio's slides (with their corrections) in
 * Studio's order until the admin manages the list; then exactly the listed
 * slides, Studio ones and admin-created ones, in that order. Products are not
 * resolved here (applyHomeProductPicks, then fillHeroProducts).
 */
export function composeHeroSlides(
  studioSlides: HomeHeroSlide[],
  copy: Pick<StorefrontCopy, "heroSlides" | "heroSlideOrder">,
  imageUrlsFor: ImageUrlsFor,
): HomeHeroSlide[] {
  const studioById = new Map(studioSlides.map((slide) => [slide.id, slide]));
  const order = copy.heroSlideOrder ?? studioSlides.map((slide) => slide.id);

  const listed = order.flatMap((id) => {
    const studio = studioById.get(id);
    const override = copy.heroSlides[id];

    if (studio) {
      return [studio];
    }

    // A created slide without a title (or a Studio slide deleted since) is skipped.
    return override?.custom && override.title?.trim() ? [blankSlide(id)] : [];
  });

  // Never an empty hero: if nothing listed exists any more, Studio's slides show.
  const slides = listed.length > 0 ? listed : studioSlides;

  return applyHeroOverrides(slides, copy.heroSlides, imageUrlsFor).map((slide) => {
    const surface = copy.heroSlides[slide.id]?.surface;

    return {
      ...slide,
      ...(surface ? { surface } : {}),
      imageAlt: slide.imageAlt || slide.title,
    };
  });
}

/** The framing set for each picked product's tile, on the products the slide ends up showing. */
export function applyHeroProductFraming(
  slides: HomeHeroSlide[],
  overrides: StorefrontCopy["heroSlides"],
): HomeHeroSlide[] {
  return slides.map((slide) => {
    const framing = overrides[slide.id]?.productFraming;

    if (!framing || !slide.products) {
      return slide;
    }

    return {
      ...slide,
      products: slide.products.map((product) =>
        framing[product.id] ? { ...product, imageFraming: framing[product.id] } : product,
      ),
    };
  });
}

/**
 * Two products for every slide still without them (admin-created slides, or
 * picks that are all gone), dealt from the home's shuffled pool, preferring
 * products no other slide shows.
 */
export function fillHeroProducts(slides: HomeHeroSlide[], pool: HomeHeroProduct[], perSlide = 2): HomeHeroSlide[] {
  const used = new Set(slides.flatMap((slide) => (slide.products ?? []).map((product) => product.id)));
  const fresh = pool.filter((product) => !used.has(product.id));
  let cursor = 0;

  return slides.map((slide) => {
    if (slide.products?.length || pool.length === 0) {
      return slide;
    }

    const source = fresh.length - cursor >= perSlide ? fresh : pool;
    const start = source === fresh ? cursor : 0;
    const products = source.slice(start, start + perSlide);

    if (source === fresh) {
      cursor += perSlide;
    }

    return { ...slide, products };
  });
}
