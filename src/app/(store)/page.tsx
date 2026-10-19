import type { Metadata } from "next";
import { SiteContainer } from "@/components/layout/site-container";
import { HomeBenefitsStrip } from "@/features/home/components/home-benefits-strip";
import { HomeCampaignFeaturedProducts } from "@/features/home/components/home-campaign-featured-products";
import { HomeCategoryRail } from "@/features/home/components/home-category-rail";
import { HomeBenefitsArrivalStrip } from "@/features/home/components/home-benefits-arrival-strip";
import { HomeEditorialCategoryBanners } from "@/features/home/components/home-editorial-category-banners";
import { HomeNewInArrivalStrip } from "@/features/home/components/home-new-in-arrival-strip";
import { HomeProductSpotlight } from "@/features/home/components/home-product-spotlight";
import { HomeOffersCarousel } from "@/features/home/components/home-offers-carousel";
import { HomeHeroSlider } from "@/features/home/components/home-hero-slider";
import { HomeNewsletterBanner } from "@/features/home/components/home-newsletter-banner";
import type {
  HomeCategoryRailItem,
  HomeHeroSlide,
} from "@/features/home/types";
import { buildMetadata } from "@/lib/seo";
import { getSanityImageUrl, TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF } from "@/integrations/sanity/image";
import { sanityFetch, sanityFreshFetch } from "@/integrations/sanity/client";
import { getHomePageData } from "@/integrations/sanity/home";
import {
  categoryTreeQuery,
  homePageQuery,
  homeCategoryRepresentativeProductQuery,
  siteSettingsQuery,
} from "@/integrations/sanity/queries";
import type {
  CategoryDocument,
  HomePageDocument,
  SiteSettingsDocument,
  SanityImageWithAlt,
} from "@/types/cms";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [homePage, siteSettings] = await Promise.all([
      sanityFreshFetch<HomePageDocument | null>(homePageQuery),
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

async function buildHomeCategoryRail(): Promise<HomeCategoryRailItem[]> {
  try {
    const categories = await sanityFetch<CategoryDocument[]>(categoryTreeQuery);

    const categoryItems = await Promise.all(
      categories.map(async (category) => {
        const representativeProduct = await sanityFreshFetch<{
          representativeImage?: SanityImageWithAlt;
        } | null>(homeCategoryRepresentativeProductQuery, {
          categorySlug: category.slug.current,
          placeholderAssetRef: TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF,
        });

        const representativeImage = representativeProduct?.representativeImage;

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
  } catch {
    return [];
  }
}

export default async function StoreIndexPage() {
  const homePage = await getHomePageData();
  const heroSlides = buildHomeSlides(homePage);
  const categoryRailItems = await buildHomeCategoryRail();

  return (
    <>
      <HomeHeroSlider slides={heroSlides} />
      <HomeCategoryRail categories={categoryRailItems} />
      {/* Same list as the featured grid right below: the strip opens with its
          first row and then cycles through all of them in shuffled groups. */}
      <HomeNewInArrivalStrip products={homePage.campaignFeatured.products} />
      <section className="pb-10 sm:pb-12">
        <SiteContainer>
          <div className="bg-surface-raised px-3 py-3.5 sm:px-4 sm:py-4.5 lg:px-5 lg:py-5">
            <HomeCampaignFeaturedProducts campaign={homePage.campaignFeatured} />
          </div>
        </SiteContainer>
      </section>
      <HomeProductSpotlight
        // TEMPORARY local preview: Sanity has no campaignFeaturedProducts yet, so
        // fall back to newInProducts. Remove once the campaign list is loaded.
        products={
          homePage.campaignSpotlightProducts.length > 0
            ? homePage.campaignSpotlightProducts
            : homePage.newInProducts
        }
        label={homePage.campaignFeatured.title}
      />
      <HomeBenefitsArrivalStrip
        label="Beneficios de comprar en Deluar"
        benefits={[
          { title: "Envíos", text: "A todo el país" },
          { title: "20% OFF", text: "Con pago en efectivo", highlight: true },
          { title: "Cuotas", text: "En todos nuestros productos" },
        ]}
      />
      <HomeEditorialCategoryBanners />

      <section className="bg-surface-raised py-12 sm:py-14">
        <SiteContainer>
          <HomeOffersCarousel products={homePage.offerProducts} />
        </SiteContainer>
      </section>
      <HomeBenefitsStrip />
      <HomeNewsletterBanner />
    </>
  );
}
