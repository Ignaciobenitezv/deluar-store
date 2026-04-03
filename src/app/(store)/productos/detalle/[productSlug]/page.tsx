import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteContainer } from "@/components/layout/site-container";
import { getProductDetailData } from "@/integrations/sanity/catalog";
import { buildMetadata } from "@/lib/seo";
import { ProductDetail } from "@/features/product/components/product-detail";
import { sanityFetch } from "@/integrations/sanity/client";
import { productBySlugQuery } from "@/integrations/sanity/queries";
import type { ProductDocument } from "@/types/cms";
import { getSanityImageUrl } from "@/integrations/sanity/image";

type ProductPageProps = {
  params: Promise<{
    productSlug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { productSlug } = await params;

  try {
    const product = await sanityFetch<ProductDocument | null>(productBySlugQuery, {
      slug: productSlug,
    });

    if (!product) {
      return buildMetadata({
        title: "Producto",
        description: "Detalle de producto de DELUAR.",
        path: `/productos/detalle/${productSlug}`,
        noIndex: true,
      });
    }

    return buildMetadata({
      title: product.seo?.title || product.title,
      description:
        product.seo?.description || product.shortDescription || "Producto de DELUAR.",
      path: `/productos/detalle/${productSlug}`,
      image: getSanityImageUrl(product.images?.[0], 1200, 630),
    });
  } catch {
    return buildMetadata({
      title: "Producto",
      description: "Detalle de producto de DELUAR.",
      path: `/productos/detalle/${productSlug}`,
    });
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productSlug } = await params;
  const product = await getProductDetailData(productSlug);

  if (!product) {
    notFound();
  }

  return (
    <SiteContainer className="py-2">
      <ProductDetail product={product} />
    </SiteContainer>
  );
}
