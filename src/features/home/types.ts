import type { CatalogCategorySummary, CatalogProductCard } from "@/features/catalog/types";

export type HomeHero = {
  eyebrow: string;
  title: string;
  text: string;
  imageUrl: string | null;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
};

export type HomeHeroSlide = HomeHero & {
  id: string;
};

export type HomePromo = {
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
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

export type HomeInstitutional = {
  title: string;
  text: string;
  contactEmail?: string;
  whatsappNumber?: string;
};

export type HomePageData = {
  hero: HomeHero;
  categories: CatalogCategorySummary[];
  featuredProducts: CatalogProductCard[];
  offerProducts: CatalogProductCard[];
  promo: HomePromo;
  institutional: HomeInstitutional;
};
