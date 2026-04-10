import type { CatalogCategorySummary, CatalogProductCard } from "@/features/catalog/types";

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

export type HomePageData = {
  hero: HomeHero;
  heroSlides: HomeHeroSlide[];
  categories: CatalogCategorySummary[];
  featuredProducts: CatalogProductCard[];
  campaignFeatured: HomeCampaignFeatured;
  offerProducts: CatalogProductCard[];
  promo: HomePromo;
  institutional: HomeInstitutional;
};
