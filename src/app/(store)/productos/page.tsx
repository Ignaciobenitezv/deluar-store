import type { Metadata } from "next";
import { SiteContainer } from "@/components/layout/site-container";
import { getCatalogPageData } from "@/integrations/sanity/catalog";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { CatalogPageHeader } from "@/features/catalog/components/catalog-page-header";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const catalog = await getCatalogPageData();

  return buildMetadata({
    title: catalog.title,
    description: catalog.description,
    path: "/productos",
  });
}

export default async function ProductsPage() {
  const catalog = await getCatalogPageData();

  return (
    <SiteContainer className="space-y-8">
      <CatalogPageHeader
        eyebrow="Catalogo"
        title={catalog.title}
        description={catalog.description}
        categories={catalog.categories}
      />

      {catalog.products.length > 0 ? (
        <ProductGrid products={catalog.products} />
      ) : (
        <CatalogEmptyState
          title="Todavia no hay productos publicados"
          description="Cuando cargues productos en Sanity, esta grilla mostrara automaticamente el catalogo real de DELUAR."
        />
      )}
    </SiteContainer>
  );
}
