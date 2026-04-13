import type { Metadata } from "next";
import { mapProductToCatalogCard } from "@/features/catalog/mappers";
import { SiteContainer } from "@/components/layout/site-container";
import { HomeCampaignBanner } from "@/features/home/components/home-campaign-banner";
import { HomeCampaignFeaturedProducts } from "@/features/home/components/home-campaign-featured-products";
import { HomeCategoryRail } from "@/features/home/components/home-category-rail";
import { HomeCategories } from "@/features/home/components/home-categories";
import { HomeNewInStrip } from "@/features/home/components/home-new-in-strip";
import { HomeOffersCarousel } from "@/features/home/components/home-offers-carousel";
import { HomeSpotlightProduct } from "@/features/home/components/home-spotlight-product";
import { HomeHeroSlider } from "@/features/home/components/home-hero-slider";
import { HomeInstitutional } from "@/features/home/components/home-institutional";
import { HomePromoBanner } from "@/features/home/components/home-promo-banner";
import type {
  HomeCategoryRailItem,
  HomeCategoryShowcaseItem,
  HomeHeroSlide,
} from "@/features/home/types";
import { buildMetadata } from "@/lib/seo";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { getHomePageData } from "@/integrations/sanity/home";
import {
  categoryTreeQuery,
  homePageQuery,
  productsByCategoryQuery,
  siteSettingsQuery,
} from "@/integrations/sanity/queries";
import type {
  CategoryDocument,
  HomePageDocument,
  ProductDocument,
  SiteSettingsDocument,
} from "@/types/cms";

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

async function buildHomeCategoryRail(): Promise<HomeCategoryRailItem[]> {
  const categories = await sanityFetch<CategoryDocument[]>(categoryTreeQuery);

  const categoryItems = await Promise.all(
    categories.map(async (category) => {
      const productDocuments = await sanityFetch<ProductDocument[]>(productsByCategoryQuery, {
        categorySlug: category.slug.current,
        subcategorySlug: "",
      });

      const representativeImage =
        productDocuments.find((product) => product.images?.[0]?.image?.asset?._ref)?.images?.[0];

      return {
        id: category._id,
        title: category.title,
        slug: category.slug.current,
        href: `/productos/${category.slug.current}`,
        imageUrl: getSanityImageUrl(representativeImage, 720, 720),
        imageAlt: representativeImage?.alt || category.title,
      };
    }),
  );

  return categoryItems;
}

export default async function StoreIndexPage() {
  const homePage = await getHomePageData();
  const heroSlides = buildHomeSlides(homePage);
  const categoryRailItems = await buildHomeCategoryRail();
  const categoryShowcaseItems = await buildHomeCategoryShowcase(homePage);

  return (
    <>
      <HomeHeroSlider slides={heroSlides} />
      <HomeCategoryRail categories={categoryRailItems} />
      <section className="py-10 sm:py-12">
        <SiteContainer>
          <div className="space-y-4 sm:space-y-5">
            <HomeCampaignBanner />
            <div className="bg-white px-3 py-3.5 sm:px-4 sm:py-4.5 lg:px-5 lg:py-5">
              <HomeCampaignFeaturedProducts campaign={homePage.campaignFeatured} />
            </div>
          </div>
        </SiteContainer>
      </section>
      <section className="group w-full bg-gradient-to-r from-[#2b2b2b] via-[#262626] to-[#2b2b2b] py-16 md:py-20">
        <div className="mx-auto max-w-[1200px] px-4 text-center">
          <div className="mb-6 h-[1px] w-16 bg-white/20 mx-auto" />
          <p className="text-[1.7rem] font-medium italic leading-tight tracking-[0.02em] text-white/95 transition-all duration-300 group-hover:tracking-[0.04em] sm:text-[2.2rem] md:text-[2.6rem]">
            lo nuevo en <span className="font-semibold">Deluar</span>
          </p>
        </div>
      </section>
      <SiteContainer className="space-y-10 py-10 sm:space-y-12 sm:py-12">
        <HomeNewInStrip products={homePage.newInProducts} />
        <HomeSpotlightProduct product={homePage.spotlightProduct} />
      </SiteContainer>
      <HomeCategories categories={categoryShowcaseItems} />

      <SiteContainer className="space-y-14 pt-12 sm:space-y-16 sm:pt-14">
        <HomeOffersCarousel products={homePage.offerProducts} />
        <HomePromoBanner promo={homePage.promo} />
        <HomeInstitutional institutional={homePage.institutional} />
      </SiteContainer>
    </>
  );
}
