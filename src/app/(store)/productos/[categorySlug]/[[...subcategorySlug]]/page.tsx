import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogEmptyState } from "@/features/catalog/components/catalog-empty-state";
import { CatalogMobileActions } from "@/features/catalog/components/catalog-mobile-actions";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { CatalogSortDrawer } from "@/features/catalog/components/catalog-sort-drawer";
import type { CatalogSort } from "@/features/catalog/types";
import { getCatalogPageData, getCategoryCatalogPageData } from "@/integrations/sanity/catalog";
import { buildMetadata } from "@/lib/seo";

type CategorySearchParams = {
  minPrice?: string | string[];
  maxPrice?: string | string[];
  inStock?: string | string[];
  sort?: string | string[];
};

type CategoryPageProps = {
  params: Promise<{
    categorySlug: string;
    subcategorySlug?: string[];
  }>;
  searchParams?: Promise<CategorySearchParams>;
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

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseNumericSearchParam(value: string | string[] | undefined) {
  const normalizedValue = getSingleSearchParam(value)?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parseBooleanSearchParam(value: string | string[] | undefined) {
  const normalizedValue = getSingleSearchParam(value)?.trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return normalizedValue === "true" || normalizedValue === "1";
}

function parseSortSearchParam(value: string | string[] | undefined): CatalogSort | undefined {
  const normalizedValue = getSingleSearchParam(value)?.trim() as CatalogSort | undefined;

  if (
    normalizedValue === "price-asc" ||
    normalizedValue === "price-desc" ||
    normalizedValue === "title-asc" ||
    normalizedValue === "title-desc" ||
    normalizedValue === "newest" ||
    normalizedValue === "oldest" ||
    normalizedValue === "best-selling"
  ) {
    return normalizedValue;
  }

  return undefined;
}

function buildCategoryPath(basePath: string, params: {
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: CatalogSort;
}) {
  const search = new URLSearchParams();

  if (typeof params.minPrice === "number") {
    search.set("minPrice", String(params.minPrice));
  }

  if (typeof params.maxPrice === "number") {
    search.set("maxPrice", String(params.maxPrice));
  }

  if (params.inStock) {
    search.set("inStock", "true");
  }

  if (params.sort) {
    search.set("sort", params.sort);
  }

  const queryString = search.toString();

  return queryString ? `${basePath}?${queryString}` : basePath;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { categorySlug, subcategorySlug } = await params;
  const subcategory = subcategorySlug?.[0] ?? "";
  const resolvedSearchParams = await searchParams;
  const minPrice = parseNumericSearchParam(resolvedSearchParams?.minPrice);
  const maxPrice = parseNumericSearchParam(resolvedSearchParams?.maxPrice);
  const inStock = parseBooleanSearchParam(resolvedSearchParams?.inStock);
  const sort = parseSortSearchParam(resolvedSearchParams?.sort);
  const [catalog, allCatalog] = await Promise.all([
    getCategoryCatalogPageData(categorySlug, subcategory, {
      minPrice,
      maxPrice,
      inStock,
      sort,
    }),
    getCatalogPageData({}),
  ]);

  if (!catalog) {
    notFound();
  }

  const basePath = `/productos/${categorySlug}${subcategory ? `/${subcategory}` : ""}`;
  const currentFilters = {
    minPrice,
    maxPrice,
    inStock,
    sort,
  };
  const hasActiveFilters = Boolean(
    typeof minPrice === "number" || typeof maxPrice === "number" || inStock,
  );
  const priceOptions = [
    {
      label: "Hasta $10.000",
      href: buildCategoryPath(basePath, {
        ...currentFilters,
        minPrice: undefined,
        maxPrice: 10000,
      }),
      isActive:
        typeof maxPrice === "number" && maxPrice === 10000 && typeof minPrice !== "number",
    },
    {
      label: "$10.000 a $30.000",
      href: buildCategoryPath(basePath, {
        ...currentFilters,
        minPrice: 10000,
        maxPrice: 30000,
      }),
      isActive: minPrice === 10000 && maxPrice === 30000,
    },
    {
      label: "Mas de $30.000",
      href: buildCategoryPath(basePath, {
        ...currentFilters,
        minPrice: 30000,
        maxPrice: undefined,
      }),
      isActive: minPrice === 30000 && typeof maxPrice !== "number",
    },
  ];

  return (
    <>
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1200px] px-6 py-10">
          <div className="flex gap-10">
            <aside className="w-[240px] shrink-0">
              <div className="space-y-10">
                <div className="space-y-4">
                  <h1 className="text-[2rem] font-medium tracking-[0.01em] text-foreground">
                    {catalog.title}
                  </h1>
                  {catalog.description ? (
                    <p className="text-sm text-neutral-500">{catalog.description}</p>
                  ) : null}
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-400">Categorias</h2>
                    <ul className="space-y-3 text-sm text-foreground">
                      {allCatalog.categories.map((category) => (
                        <li key={category.id}>
                          <Link href={category.href} className="transition hover:underline">
                            {category.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4 border-t border-neutral-100 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-400">Filtrar por</h2>
                      {hasActiveFilters ? (
                        <Link
                          href={basePath}
                          className="text-xs text-neutral-500 transition hover:underline"
                        >
                          Limpiar filtros
                        </Link>
                      ) : null}
                    </div>
                    <div className="space-y-4 text-sm text-foreground">
                      <div className="space-y-2">
                        <h3 className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">Disponibilidad</h3>
                        <ul className="space-y-2 text-neutral-700">
                          <li>
                            <Link
                              href={buildCategoryPath(basePath, {
                                ...currentFilters,
                                inStock: true,
                              })}
                              className={inStock ? "flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-black" : "flex items-center gap-2 text-sm text-neutral-700 transition hover:text-black"}
                            >
                              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300">
                                {inStock ? <span className="h-2 w-2 rounded-full bg-black" /> : null}
                              </span>
                              En stock
                            </Link>
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">Precio</h3>
                        <ul className="space-y-2 text-neutral-700">
                          {priceOptions.map((option) => (
                            <li key={option.label}>
                              <Link
                                href={option.href}
                                className={option.isActive ? "flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-black" : "flex items-center gap-2 text-sm text-neutral-700 transition hover:text-black"}
                              >
                                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300">
                                  {option.isActive ? <span className="h-2 w-2 rounded-full bg-black" /> : null}
                                </span>
                                {option.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1 space-y-8">
              <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    {subcategory ? "Subcategoria" : "Categoria"}
                  </p>
                  <h2 className="text-[2rem] font-medium tracking-[0.01em] text-foreground">
                    {catalog.title}
                  </h2>
                </div>
                <CatalogSortDrawer sort={sort} />
              </div>

              {catalog.products.length > 0 ? (
                <ProductGrid products={catalog.products} variant="desktopCatalog" />
              ) : (
                <CatalogEmptyState
                  title="No hay productos publicados en esta seccion"
                  description="La estructura ya esta conectada. Cuando publiques productos en Sanity para esta categoria, apareceran automaticamente aqui."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <section className="space-y-6">
          <div className="relative h-[160px] w-full overflow-hidden bg-[#e9dfd2]">
            {catalog.products[0]?.imageUrl ? (
              <>
                <Image
                  src={catalog.products[0].imageUrl}
                  alt={catalog.products[0].imageAlt}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/25" />
              </>
            ) : null}

            <div className="absolute bottom-5 left-4 right-4 text-white">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/85">
                Inicio / {subcategory ? "Subcategoria" : "Categoria"}
              </p>
              <h1 className="mt-2 text-[1.9rem] font-medium tracking-[0.01em]">
                {catalog.title}
              </h1>
            </div>
          </div>

          <CatalogMobileActions
            activeCategorySlug={categorySlug}
            basePath={basePath}
            categories={allCatalog.categories}
            sort={sort}
          />

          <div className="w-full px-1.5 lg:px-0">
            {catalog.products.length > 0 ? (
              <ProductGrid products={catalog.products} />
            ) : (
              <CatalogEmptyState
                title="No hay productos publicados en esta seccion"
                description="La estructura ya esta conectada. Cuando publiques productos en Sanity para esta categoria, apareceran automaticamente aqui."
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
