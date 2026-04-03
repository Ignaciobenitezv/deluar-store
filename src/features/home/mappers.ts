import { siteConfig } from "@/config/site";
import { mapCategoryToSummary, mapProductToCatalogCard } from "@/features/catalog/mappers";
import type { HomePageData } from "@/features/home/types";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import type {
  CategoryDocument,
  HomePageDocument,
  ProductDocument,
  PromoSettingsDocument,
  SiteSettingsDocument,
} from "@/types/cms";

type MapHomePageDataInput = {
  homePage: HomePageDocument | null;
  categories: CategoryDocument[];
  featuredProducts: ProductDocument[];
  promoSettings: PromoSettingsDocument | null;
  siteSettings: SiteSettingsDocument | null;
};

export function mapHomePageData({
  homePage,
  categories,
  featuredProducts,
  promoSettings,
  siteSettings,
}: MapHomePageDataInput): HomePageData {
  const selectedFeaturedProducts =
    homePage?.featuredProducts && homePage.featuredProducts.length > 0
      ? homePage.featuredProducts
      : featuredProducts;

  const selectedCategories =
    homePage?.featuredCategories && homePage.featuredCategories.length > 0
      ? homePage.featuredCategories
      : categories.slice(0, 4);

  const fallbackHeroImage =
    homePage?.heroImage ?? selectedFeaturedProducts[0]?.images?.[0];

  return {
    hero: {
      eyebrow: siteSettings?.siteName || siteConfig.name,
      title: homePage?.heroTitle || "Textiles y objetos para una casa con calma.",
      text:
        homePage?.heroText ||
        siteSettings?.siteDescription ||
        "Una seleccion de piezas para cocina, living, dormitorio y bano curadas para DELUAR.",
      imageUrl: getSanityImageUrl(fallbackHeroImage, 1400, 1560),
      imageAlt: fallbackHeroImage?.alt || homePage?.heroTitle || siteConfig.name,
      ctaLabel: homePage?.heroCtaLabel || "Ver productos",
      ctaHref: homePage?.heroCtaHref || "/productos",
    },
    categories: selectedCategories.map(mapCategoryToSummary),
    featuredProducts: selectedFeaturedProducts.map(mapProductToCatalogCard),
    promo: {
      title: homePage?.promoTitle || "Compra con calma, elegi con tiempo.",
      text:
        homePage?.promoText ||
        promoSettings?.announcementText ||
        "Descubri piezas para renovar cada ambiente con una estetica calida, simple y atemporal.",
      ctaLabel: homePage?.promoCtaLabel || "Explorar destacados",
      ctaHref: homePage?.promoCtaHref || "/productos",
    },
    institutional: {
      title: homePage?.institutionalTitle || "Una tienda pensada para vivir mejor cada ambiente.",
      text:
        homePage?.institutionalText ||
        siteSettings?.siteDescription ||
        "DELUAR reune textiles, objetos y detalles de decoracion con una mirada serena, funcional y contemporanea.",
      contactEmail: siteSettings?.contactEmail,
      whatsappNumber: siteSettings?.whatsappNumber,
    },
  };
}
