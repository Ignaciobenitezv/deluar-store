import "server-only";
import { mapProductToCatalogCard } from "@/features/catalog/mappers";
import { isVisibleProduct } from "@/features/home/mappers";
import type { HomePageData } from "@/features/home/types";
import {
  copySnapshotFromDocuments,
  type CopyEditorSnapshot,
  type HeroSlideBase,
  type ProductSummary,
} from "@/features/storefront-copy/editor";
import type { ProductListId, StorefrontCopy } from "@/features/storefront-copy/fields";
import { getHomePageData } from "@/integrations/sanity/home";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { productsByIdsQuery, storefrontCopyQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import type { ProductDocument } from "@/types/cms";
import { readCopySnapshot } from "./storefront-copy-service";
import { createSanityCopyStore } from "./storefront-copy-store";

export type AdminStorefrontCopyData = {
  snapshot: CopyEditorSnapshot;
  /** The hero slides as the home renders them (Studio texts, before corrections). */
  heroSlides: HeroSlideBase[];
  /** What each list shows when nothing is picked, as the home renders it now. */
  automaticProducts: Record<ProductListId, string[]>;
  /** Every product the editor needs to show, by id (picked or automatic). */
  products: Record<string, ProductSummary>;
  /** False when Sanity could not be read: the editor starts from the defaults. */
  isAvailable: boolean;
  /** Write credentials configured: drafts can be read, saved and published. */
  canWrite: boolean;
};

export function toProductSummary(product: ProductDocument): ProductSummary {
  const card = mapProductToCatalogCard(product);

  return {
    id: card.id,
    title: card.title,
    imageUrl: card.images[0]?.url ?? card.imageUrl,
    basePrice: card.basePrice,
    available: isVisibleProduct(product),
  };
}

type Card = { id: string; title: string; imageUrl: string | null; basePrice: number };

const cardSummary = (card: Card): ProductSummary => ({
  id: card.id,
  title: card.title,
  imageUrl: card.imageUrl,
  basePrice: card.basePrice,
  available: true,
});

function heroSlideBases(homePage: HomePageData): HeroSlideBase[] {
  // Same slides, same fallbacks as the home page (app/(store)/page.tsx).
  const slides = homePage.heroSlides.length > 0 ? homePage.heroSlides : [homePage.hero];

  return slides.map((slide) => ({
    id: slide.id,
    imageUrl: slide.imageUrl,
    surface: slide.surface ?? "sand",
    automaticProducts: (slide.products ?? []).map((product) => product.id),
    texts: {
      eyebrow: slide.eyebrow,
      title: slide.title,
      text: slide.text,
      ctaLabel: slide.ctaLabel,
      ctaHref: slide.ctaHref,
      secondaryCtaLabel: slide.secondaryCtaLabel ?? "",
      secondaryCtaHref: slide.secondaryCtaHref ?? "",
    },
  }));
}

/** Product ids picked in either stored version, to describe them in the picker. */
function pickedIds(copies: StorefrontCopy[]) {
  return [
    ...new Set(
      copies.flatMap((copy) => [
        ...Object.values(copy.productLists).flat(),
        ...Object.values(copy.heroSlides).flatMap((override) => override.products ?? []),
      ]),
    ),
  ];
}

async function readSnapshot() {
  const store = createSanityCopyStore();

  if (store) {
    return { snapshot: await readCopySnapshot(store), canWrite: true };
  }

  const published = await sanityFreshFetch<unknown>(storefrontCopyQuery);

  return { snapshot: copySnapshotFromDocuments(published, null), canWrite: false };
}

/** What the Textos tab opens on, read fresh on every visit (same rules as Apariencia). */
export async function getAdminStorefrontCopy(): Promise<AdminStorefrontCopyData> {
  const homePage = await getHomePageData().catch(() => null);
  const products: Record<string, ProductSummary> = {};
  const heroSlides = homePage ? heroSlideBases(homePage) : [];
  const spotlight = homePage
    ? homePage.campaignSpotlightProducts.length > 0
      ? homePage.campaignSpotlightProducts
      : homePage.newInProducts
    : [];
  const automaticProducts: Record<ProductListId, string[]> = {
    featured: homePage?.campaignFeatured.products.map((product) => product.id) ?? [],
    spotlight: spotlight.map((product) => product.id),
    offers: homePage?.offerProducts.map((product) => product.id) ?? [],
  };

  for (const card of [
    ...(homePage?.campaignFeatured.products ?? []),
    ...spotlight,
    ...(homePage?.offerProducts ?? []),
  ]) {
    products[card.id] = cardSummary(card);
  }

  for (const slide of homePage?.heroSlides ?? []) {
    for (const product of slide.products ?? []) {
      products[product.id] = cardSummary({ ...product, imageUrl: product.imageUrl });
    }
  }

  let base: Pick<AdminStorefrontCopyData, "snapshot" | "canWrite" | "isAvailable">;

  try {
    base = { ...(await readSnapshot()), isAvailable: true };
  } catch (error) {
    logger.warn("[copy] Admin editor could not read Sanity", {
      error: error instanceof Error ? error.message : String(error),
    });

    base = { snapshot: copySnapshotFromDocuments(null, null), isAvailable: false, canWrite: false };
  }

  const ids = pickedIds([base.snapshot.published.copy, ...(base.snapshot.saved ? [base.snapshot.saved.copy] : [])]);

  if (ids.length > 0) {
    try {
      for (const product of await sanityFreshFetch<ProductDocument[]>(productsByIdsQuery, { ids })) {
        products[product._id] = toProductSummary(product);
      }
    } catch {
      // The picker still lists them by id; previews show them empty.
    }
  }

  return { ...base, heroSlides, automaticProducts, products };
}
