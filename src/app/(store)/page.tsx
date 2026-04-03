import type { Metadata } from "next";
import { SiteContainer } from "@/components/layout/site-container";
import { HomeCategories } from "@/features/home/components/home-categories";
import { HomeFeaturedProducts } from "@/features/home/components/home-featured-products";
import { HomeHeroSlider } from "@/features/home/components/home-hero-slider";
import { HomeInstitutional } from "@/features/home/components/home-institutional";
import { HomePromoBanner } from "@/features/home/components/home-promo-banner";
import type { HomeHeroSlide } from "@/features/home/types";
import { buildMetadata } from "@/lib/seo";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { getHomePageData } from "@/integrations/sanity/home";
import { homePageQuery, siteSettingsQuery } from "@/integrations/sanity/queries";
import type { HomePageDocument, SiteSettingsDocument } from "@/types/cms";

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
  const slides: HomeHeroSlide[] = [
    {
      id: "hero-main",
      ...homePage.hero,
    },
  ];

  const featuredSlides = homePage.featuredProducts
    .filter((product) => product.imageUrl)
    .slice(0, 3)
    .map<HomeHeroSlide>((product) => ({
      id: `featured-${product.id}`,
      eyebrow: product.categoryTitle,
      title: product.title,
      text: product.shortDescription,
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt,
      ctaLabel: "Ver producto",
      ctaHref: product.productHref,
    }));

  return [...slides, ...featuredSlides].slice(0, 4);
}

function buildHomeCategoryVisuals(homePage: Awaited<ReturnType<typeof getHomePageData>>) {
  return homePage.categories.map((category, index) => {
    const relatedProduct =
      homePage.featuredProducts.find((product) => product.categorySlug === category.slug) ??
      homePage.featuredProducts[index % Math.max(homePage.featuredProducts.length, 1)];

    return {
      id: category.id,
      title: category.title,
      description: category.description,
      href: category.href,
      imageUrl: relatedProduct?.imageUrl ?? null,
      imageAlt: relatedProduct?.imageAlt || category.title,
    };
  });
}

export default async function StoreIndexPage() {
  const homePage = await getHomePageData();
  const heroSlides = buildHomeSlides(homePage);
  const categoryVisuals = buildHomeCategoryVisuals(homePage);

  return (
    <>
      <HomeHeroSlider slides={heroSlides} />
      <HomeCategories categories={categoryVisuals} />

      <SiteContainer className="space-y-14 pt-12 sm:space-y-16 sm:pt-14">
        <HomeFeaturedProducts products={homePage.featuredProducts} />
        <HomePromoBanner promo={homePage.promo} />
        <HomeInstitutional institutional={homePage.institutional} />
      </SiteContainer>
    </>
  );
}
