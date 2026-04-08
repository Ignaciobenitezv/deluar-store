import type { Metadata } from "next";
import { mapProductToCatalogCard } from "@/features/catalog/mappers";
import { SiteContainer } from "@/components/layout/site-container";
import { HomeCategories } from "@/features/home/components/home-categories";
import { HomeFeaturedProducts } from "@/features/home/components/home-featured-products";
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
      const fallbackImageProduct =
        products[0] ??
        homePage.featuredProducts.find(
          (product) => normalizeSlug(product.categorySlug) === normalizeSlug(category.slug),
        );

      return {
        id: category.id,
        title: category.title,
        slug: category.slug,
        description: category.description,
        href: category.href,
        imageUrl: fallbackImageProduct?.imageUrl ?? null,
        imageAlt: fallbackImageProduct?.imageAlt || category.title,
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
        <HomeFeaturedProducts products={homePage.featuredProducts} />
        <HomePromoBanner promo={homePage.promo} />
        <HomeInstitutional institutional={homePage.institutional} />
      </SiteContainer>
    </>
  );
}
