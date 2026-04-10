import { siteConfig } from "@/config/site";
import { mapCategoryToSummary, mapProductToCatalogCard } from "@/features/catalog/mappers";
import type { HomePageData } from "@/features/home/types";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import type {
  CategoryDocument,
  HomeHeroSlideDocument,
  HomePageDocument,
  ProductDocument,
  PromoSettingsDocument,
  SiteSettingsDocument,
} from "@/types/cms";

type MapHomePageDataInput = {
  homePage: HomePageDocument | null;
  categories: CategoryDocument[];
  featuredProducts: ProductDocument[];
  offerProducts: ProductDocument[];
  promoSettings: PromoSettingsDocument | null;
  siteSettings: SiteSettingsDocument | null;
};

export function mapHomePageData({
  homePage,
  categories,
  featuredProducts,
  offerProducts,
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

  const fallbackHeroImage = homePage?.heroImage ?? selectedFeaturedProducts[0]?.images?.[0];

  const heroSlides = (homePage?.heroSlides ?? [])
    .filter((slide) => slide.isActive !== false)
    .map((slide: HomeHeroSlideDocument, index) => ({
      id: slide._key || `hero-slide-${index}`,
      eyebrow: slide.eyebrow || siteSettings?.siteName || siteConfig.name,
      title: slide.title,
      text: slide.text || "",
      imageUrl: getSanityImageUrl(slide.desktopImage, 1800, 1080),
      mobileImageUrl: getSanityImageUrl(slide.mobileImage, 900, 1200),
      imageAlt: slide.desktopImage?.alt || slide.title,
      ctaLabel: slide.primaryCtaLabel || "Ver productos",
      ctaHref: slide.primaryCtaHref || "/productos",
      secondaryCtaLabel: slide.secondaryCtaLabel,
      secondaryCtaHref: slide.secondaryCtaHref,
    }));

  return {
    hero: {
      id: heroSlides[0]?.id || "hero-main",
      eyebrow: siteSettings?.siteName || siteConfig.name,
      title: homePage?.heroTitle || "Textiles y objetos para una casa con calma.",
      text:
        homePage?.heroText ||
        siteSettings?.siteDescription ||
        "Una seleccion de piezas para cocina, living, dormitorio y bano curadas para DELUAR.",
      imageUrl: getSanityImageUrl(fallbackHeroImage, 1400, 1560),
      mobileImageUrl: getSanityImageUrl(fallbackHeroImage, 900, 1200),
      imageAlt: fallbackHeroImage?.alt || homePage?.heroTitle || siteConfig.name,
      ctaLabel: homePage?.heroCtaLabel || "Ver productos",
      ctaHref: homePage?.heroCtaHref || "/productos",
      secondaryCtaLabel: undefined,
      secondaryCtaHref: undefined,
    },
    heroSlides:
      heroSlides.length > 0
        ? heroSlides
        : [
            {
              id: "hero-main",
              eyebrow: siteSettings?.siteName || siteConfig.name,
              title: homePage?.heroTitle || "Textiles y objetos para una casa con calma.",
              text:
                homePage?.heroText ||
                siteSettings?.siteDescription ||
                "Una seleccion de piezas para cocina, living, dormitorio y bano curadas para DELUAR.",
              imageUrl: getSanityImageUrl(fallbackHeroImage, 1800, 1080),
              mobileImageUrl: getSanityImageUrl(fallbackHeroImage, 900, 1200),
              imageAlt: fallbackHeroImage?.alt || homePage?.heroTitle || siteConfig.name,
              ctaLabel: homePage?.heroCtaLabel || "Ver productos",
              ctaHref: homePage?.heroCtaHref || "/productos",
              secondaryCtaLabel: undefined,
              secondaryCtaHref: undefined,
            },
          ],
    categories: selectedCategories.map(mapCategoryToSummary),
    featuredProducts: selectedFeaturedProducts.map(mapProductToCatalogCard),
    campaignFeatured: {
      title: homePage?.campaignFeaturedTitle || "Selecciones para regalar y renovar tu casa",
      text:
        homePage?.campaignFeaturedText ||
        "Una curaduria de productos destacados para campanas especiales, regalos y selecciones tematicas.",
      ctaLabel: homePage?.campaignFeaturedCtaLabel || undefined,
      ctaHref: homePage?.campaignFeaturedCtaHref || undefined,
      products: featuredProducts.map(mapProductToCatalogCard),
    },
    offerProducts: offerProducts.map(mapProductToCatalogCard),
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
