import type { Metadata } from "next";
import { mapProductToCatalogCard } from "@/features/catalog/mappers";
import { SiteContainer } from "@/components/layout/site-container";
import { HomeCategories } from "@/features/home/components/home-categories";
import { HomeOffersCarousel } from "@/features/home/components/home-offers-carousel";
import { HomeHeroSlider } from "@/features/home/components/home-hero-slider";
import { HomeInstitutional } from "@/features/home/components/home-institutional";
import { HomePromoBanner } from "@/features/home/components/home-promo-banner";
import type { HomeCategoryShowcaseItem, HomeHeroSlide } from "@/features/home/types";
import { buildMetadata } from "@/lib/seo";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { getHomePageData } from "@/integrations/sanity/home";
import {
  homePageQuery,
  productsByCategoryQuery,
  siteSettingsQuery,
} from "@/integrations/sanity/queries";
import type { HomePageDocument, ProductDocument, SiteSettingsDocument } from "@/types/cms";

const SHOWCASE_CATEGORY_ORDER = ["cocina", "dormitorio", "living", "bano"];

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [homePage, siteSettings] = await Promise.all([
      sanityFetch<HomePageDocument | null>(homePageQuery),
      sanityFetch<SiteSettingsDocument | null>(siteSettingsQuery),
    ]);

    return buildMetadata({
      title: homePage?.seo?.title,
      description:
        homePage?.seo?.description ||
        homePage?.heroText ||
        siteSettings?.siteDescription,
      path: "/",
      image: getSanityImageUrl(homePage?.heroImage, 1200, 630),
    });
  } catch {
    return buildMetadata({
      description: "Textiles, bazar y objetos de decoracion para cada ambiente del hogar.",
      path: "/",
    });
  }
}

function buildHomeSlides(homePage: Awaited<ReturnType<typeof getHomePageData>>): HomeHeroSlide[] {
  return homePage.heroSlides.length > 0 ? homePage.heroSlides : [homePage.hero];
}

async function buildHomeCategoryShowcase(
  homePage: Awaited<ReturnType<typeof getHomePageData>>,
): Promise<HomeCategoryShowcaseItem[]> {
  const categoryBySlug = new Map(
    homePage.categories.map((category) => [normalizeSlug(category.slug), category]),
  );

  const selectedCategories = SHOWCASE_CATEGORY_ORDER.map((slug) => categoryBySlug.get(slug)).filter(
    (category): category is NonNullable<typeof category> => Boolean(category),
  );

  const showcaseItems = await Promise.all(
    selectedCategories.map(async (category) => {
      const productDocuments = await sanityFetch<ProductDocument[]>(productsByCategoryQuery, {
        categorySlug: category.slug,
        subcategorySlug: "",
      });
      const products = productDocuments.map(mapProductToCatalogCard);
      const showcaseImage =
        productDocuments.find((product) => product.images?.[0]?.image?.asset?._ref)?.images?.[0];
      const featuredFallbackProduct = homePage.featuredProducts.find(
        (product) =>
          normalizeSlug(product.categorySlug) === normalizeSlug(category.slug) && product.imageUrl,
      );

      return {
        id: category.id,
        title: category.title,
        slug: category.slug,
        description: category.description,
        href: category.href,
        imageUrl:
          getSanityImageUrl(showcaseImage, 1400, 1560) ?? featuredFallbackProduct?.imageUrl ?? null,
        imageAlt: showcaseImage?.alt || featuredFallbackProduct?.imageAlt || category.title,
        products,
      };
    }),
  );

  return showcaseItems.filter((item) => item.products.length > 0);
}

export default async function StoreIndexPage() {
  const homePage = await getHomePageData();
  const heroSlides = buildHomeSlides(homePage);
  const categoryShowcaseItems = await buildHomeCategoryShowcase(homePage);

  return (
    <>
      <HomeHeroSlider slides={heroSlides} />
      <HomeCategories categories={categoryShowcaseItems} />

      <SiteContainer className="space-y-14 pt-12 sm:space-y-16 sm:pt-14">
        <HomeOffersCarousel products={homePage.offerProducts} />
        <HomePromoBanner promo={homePage.promo} />
        <HomeInstitutional institutional={homePage.institutional} />
      </SiteContainer>
    </>
  );
}
