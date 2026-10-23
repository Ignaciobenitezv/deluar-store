import type { ImageFraming } from "@/features/storefront-copy/fields";
import type {
  CatalogCategorySummary,
  CatalogProductCard,
  ProductDetailImage,
} from "@/features/catalog/types";

// Brand-safe surfaces a slide can use. A closed list (not free colors) so a
// future admin editor can only pick combinations whose contrast is solved.
export type HomeHeroSurface = "promo" | "sand" | "brown";

export type HomeHeroProduct = {
  id: string;
  title: string;
  href: string;
  imageUrl: string | null;
  imageAlt: string;
  imageObjectPosition?: string;
  /** Framing set for this tile in Configuración → Textos; wins over imageObjectPosition. */
  imageFraming?: ImageFraming;
  basePrice: number;
  pricePrefix?: string | null;
};

export type HomeHero = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  imageUrl: string | null;
  mobileImageUrl?: string | null;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  /** Hand-set framing of the photo (Configuración → Textos). */
  imageFraming?: ImageFraming;
  /** Defaults are assigned by the mapper until slides carry their own. */
  surface?: HomeHeroSurface;
  /** Up to two protagonist products; temporary random picks for now. */
  products?: HomeHeroProduct[];
};

export type HomeHeroSlide = HomeHero;

export type HomePromo = {
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
};

export type HomeCampaignFeatured = {
  title: string;
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
  products: CatalogProductCard[];
};

export type HomeCategoryShowcaseItem = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  href: string;
  imageUrl: string | null;
  imageAlt: string;
  products: CatalogProductCard[];
};

export type HomeCategoryRailItem = {
  id: string;
  title: string;
  slug: string;
  href: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type HomeInstitutional = {
  title: string;
  text: string;
  contactEmail?: string;
  whatsappNumber?: string;
};

export type HomeSpotlightProduct = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  basePrice: number;
  transferPrice?: number;
  pricePrefix?: string | null;
  stock: number;
  productHref: string;
  images: ProductDetailImage[];
  categoryTitle: string;
  attributes: {
    label: string;
    value: string;
  }[];
};

export type HomeNewInProduct = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  basePrice: number;
  transferPrice?: number;
  pricePrefix?: string | null;
  stock: number;
  imageUrl: string | null;
  imageAlt: string;
  hoverImageUrl?: string | null;
  hoverImageAlt?: string;
  categorySlug: string;
  categoryTitle: string;
  subcategorySlug?: string;
  productHref: string;
  hasSelectableOptions: boolean;
  images: ProductDetailImage[];
  attributes: {
    label: string;
    value: string;
  }[];
};

export type HomePageData = {
  hero: HomeHero;
  heroSlides: HomeHeroSlide[];
  /** The shuffled products the hero deals from, for slides added in the admin. */
  heroProductPool: HomeHeroProduct[];
  categories: CatalogCategorySummary[];
  featuredProducts: CatalogProductCard[];
  campaignFeatured: HomeCampaignFeatured;
  newInProducts: HomeNewInProduct[];
  /** Sanity `campaignFeaturedProducts`, shaped for the synchronized spotlight block. */
  campaignSpotlightProducts: HomeNewInProduct[];
  spotlightProduct: HomeSpotlightProduct | null;
  offerProducts: CatalogProductCard[];
  promo: HomePromo;
  institutional: HomeInstitutional;
};
