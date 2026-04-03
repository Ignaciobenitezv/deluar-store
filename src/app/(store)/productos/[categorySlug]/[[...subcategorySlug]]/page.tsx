import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteContainer } from "@/components/layout/site-container";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { CatalogPageHeader } from "@/features/catalog/components/catalog-page-header";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { getCategoryCatalogPageData } from "@/integrations/sanity/catalog";
import { buildMetadata } from "@/lib/seo";

type CategoryPageProps = {
  params: Promise<{
    categorySlug: string;
    subcategorySlug?: string[];
  }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categorySlug, subcategorySlug } = await params;
  const subcategory = subcategorySlug?.[0] ?? "";
  const catalog = await getCategoryCatalogPageData(categorySlug, subcategory);

  if (!catalog) {
    return buildMetadata({
      title: "Categoria",
      description: "Seccion de productos de DELUAR.",
      path: `/productos/${categorySlug}${subcategory ? `/${subcategory}` : ""}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: catalog.title,
    description: catalog.description,
    path: `/productos/${categorySlug}${subcategory ? `/${subcategory}` : ""}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug, subcategorySlug } = await params;
  const subcategory = subcategorySlug?.[0] ?? "";
  const catalog = await getCategoryCatalogPageData(categorySlug, subcategory);

  if (!catalog) {
    notFound();
  }

  return (
    <SiteContainer className="space-y-8">
      <CatalogPageHeader
        eyebrow={subcategory ? "Subcategoria" : "Categoria"}
        title={catalog.title}
        description={catalog.description}
        categories={catalog.categories}
      />

      {catalog.products.length > 0 ? (
        <ProductGrid products={catalog.products} />
      ) : (
        <CatalogEmptyState
          title="No hay productos publicados en esta seccion"
          description="La estructura ya esta conectada. Cuando publiques productos en Sanity para esta categoria, apareceran automaticamente aqui."
        />
      )}
    </SiteContainer>
  );
}
