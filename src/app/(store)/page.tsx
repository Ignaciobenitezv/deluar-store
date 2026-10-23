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
  HomePageData,
} from "@/features/home/types";
import { getStorefrontCopy } from "@/features/storefront-copy/server/get-storefront-copy";
import { composeHeroSlides, fillHeroProducts } from "@/features/storefront-copy/hero-slides";
import { sectionImageSrc } from "@/features/storefront-copy/section-images";
import type { StorefrontCopy } from "@/features/storefront-copy/fields";
import { applyHomeProductPicks, homeProductPickIds, type HomeProductPicks } from "@/features/home/mappers";
import { buildMetadata } from "@/lib/seo";
import { getSanityAssetUrl, getSanityImageUrl, TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF } from "@/integrations/sanity/image";
import { sanityFetch, sanityFreshFetch } from "@/integrations/sanity/client";
import { getHomePageData } from "@/integrations/sanity/home";
import {
  categoryTreeQuery,
  homePageQuery,
  homeCategoryRepresentativeProductQuery,
  productsByIdsQuery,
  siteSettingsQuery,
} from "@/integrations/sanity/queries";
import type {
  CategoryDocument,
  HomePageDocument,
  ProductDocument,
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

/** Products picked in Configuración → Textos replace the automatic lists they were picked for. */
async function withProductPicks(homePage: HomePageData, copy: StorefrontCopy): Promise<HomePageData> {
  const picks: HomeProductPicks = {
    ...copy.productLists,
    heroBySlide: Object.fromEntries(
      Object.entries(copy.heroSlides).flatMap(([slideId, override]) => (override.products?.length ? [[slideId, override.products]] : [])),
    ),
  };
  const ids = homeProductPickIds(picks);

  if (ids.length === 0) {
    return homePage;
  }

  try {
    return applyHomeProductPicks(homePage, picks, await sanityFreshFetch<ProductDocument[]>(productsByIdsQuery, { ids }));
  } catch {
    // Sanity unreachable: the automatic lists already loaded still render.
    return homePage;
  }
}

export default async function StoreIndexPage() {
  const [baseHomePage, { copy }] = await Promise.all([getHomePageData(), getStorefrontCopy()]);
  // The hero as set in Configuración → Textos: its slides, order, texts and photos…
  const composedSlides = composeHeroSlides(buildHomeSlides(baseHomePage), copy, (assetRef) => ({
    // Uncropped: the panel crops it with the hand-set framing, the same on every screen.
    imageUrl: getSanityAssetUrl(assetRef, 1800),
    mobileImageUrl: null,
  }));
  // …then every picked product list, then products for slides still without any.
  const homePage = await withProductPicks({ ...baseHomePage, heroSlides: composedSlides }, copy);
  const heroSlides = fillHeroProducts(homePage.heroSlides, homePage.heroProductPool);
  const categoryRailItems = await buildHomeCategoryRail();

  return (
    <>
      <HomeHeroSlider slides={heroSlides} />
      <HomeCategoryRail categories={categoryRailItems} title={copy.categories.title} />
      {/* Same list as the featured grid right below: the strip opens with its
          first row and then cycles through all of them in shuffled groups. */}
      <HomeNewInArrivalStrip products={homePage.campaignFeatured.products} copy={copy.newArrivals} />
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
        label={copy.benefits.label}
        benefits={[
          { title: copy.benefits.shippingTitle, text: copy.benefits.shippingText },
          { title: copy.benefits.paymentTitle, text: copy.benefits.paymentText, highlight: true },
          { title: copy.benefits.installmentsTitle, text: copy.benefits.installmentsText },
        ]}
      />
      <HomeEditorialCategoryBanners
        copy={copy.editorial}
        images={{
          first: { src: sectionImageSrc(copy.images, "editorialFirst"), framing: copy.imageFraming.editorialFirst },
          second: { src: sectionImageSrc(copy.images, "editorialSecond"), framing: copy.imageFraming.editorialSecond },
        }}
      />

      <section className="bg-surface-raised py-12 sm:py-14">
        <SiteContainer>
          <HomeOffersCarousel products={homePage.offerProducts} copy={copy.offers} />
        </SiteContainer>
      </section>
      <HomeBenefitsStrip copy={copy.benefits} />
      <HomeNewsletterBanner
        copy={copy.newsletter}
        imageSrc={sectionImageSrc(copy.images, "newsletter", 2400)}
        framing={copy.imageFraming.newsletter}
      />
    </>
  );
}
