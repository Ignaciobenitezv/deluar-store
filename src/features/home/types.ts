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
  promo: HomePromo;
  institutional: HomeInstitutional;
};
