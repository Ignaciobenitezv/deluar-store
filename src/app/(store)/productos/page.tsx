import type { Metadata } from "next";
import { SiteContainer } from "@/components/layout/site-container";
import { getCatalogPageData } from "@/integrations/sanity/catalog";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { CatalogPageHeader } from "@/features/catalog/components/catalog-page-header";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { buildMetadata } from "@/lib/seo";

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const catalog = await getCatalogPageData(query);

  return buildMetadata({
    title: catalog.title,
    description: catalog.description,
    path: query ? `/productos?q=${encodeURIComponent(query)}` : "/productos",
  });
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const catalog = await getCatalogPageData(query);

  return (
    <SiteContainer className="space-y-8">
      <CatalogPageHeader
        eyebrow={query ? "Busqueda" : "Catalogo"}
        title={catalog.title}
        description={catalog.description}
        categories={catalog.categories}
      />

      {catalog.products.length > 0 ? (
        <ProductGrid products={catalog.products} />
      ) : (
        <CatalogEmptyState
          title={query ? "No encontramos productos para tu busqueda" : "Todavia no hay productos publicados"}
          description={
            query
              ? `No hay productos que coincidan con "${query}".`
              : "Cuando cargues productos en Sanity, esta grilla mostrara automaticamente el catalogo real de DELUAR."
          }
        />
      )}
    </SiteContainer>
  );
}
