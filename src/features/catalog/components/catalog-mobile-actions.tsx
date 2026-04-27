"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogCategorySummary, CatalogSort } from "@/features/catalog/types";

type CatalogMobileActionsProps = {
  activeCategorySlug: string;
  basePath: string;
  categories: CatalogCategorySummary[];
  sort?: CatalogSort;
};

type SheetMode = "filters" | "sort" | null;

const sortOptions: Array<{ label: string; value: CatalogSort }> = [
  { label: "Precio: menor a mayor", value: "price-asc" },
  { label: "Precio: mayor a menor", value: "price-desc" },
  { label: "A - Z", value: "title-asc" },
  { label: "Z - A", value: "title-desc" },
  { label: "Mas nuevo al mas viejo", value: "newest" },
  { label: "Mas viejo al mas nuevo", value: "oldest" },
  { label: "Mas vendidos", value: "best-selling" },
];

function FiltersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16" />
      <path strokeLinecap="round" d="M7 12h10" />
      <path strokeLinecap="round" d="M10 17h4" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" d="M6 8h12" />
      <path strokeLinecap="round" d="M9 12h9" />
      <path strokeLinecap="round" d="M12 16h6" />
    </svg>
  );
}

function CheckIcon({ visible }: { visible: boolean }) {
  return <span className={visible ? "text-foreground" : "invisible"}>{"\u2713"}</span>;
}

export function CatalogMobileActions({
  activeCategorySlug,
  basePath,
  categories,
  sort,
}: CatalogMobileActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openSheet, setOpenSheet] = useState<SheetMode>(null);
  const currentParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const activeSort = sort ?? "best-selling";
  const minPrice = currentParams.get("minPrice");
  const maxPrice = currentParams.get("maxPrice");
  const inStock = currentParams.get("inStock") === "true";

  const navigateWithParams = (path: string, nextParams: URLSearchParams) => {
    const queryString = nextParams.toString();
    setOpenSheet(null);
    router.push(queryString ? `${path}?${queryString}` : path, { scroll: false });
  };

  const applySort = (nextSort: CatalogSort) => {
    const nextParams = new URLSearchParams(currentParams.toString());
    nextParams.set("sort", nextSort);
    navigateWithParams(basePath, nextParams);
  };

  const applyStock = () => {
    const nextParams = new URLSearchParams(currentParams.toString());
    nextParams.set("inStock", "true");
    navigateWithParams(basePath, nextParams);
  };

  const applyPrice = (next: { minPrice?: number; maxPrice?: number }) => {
    const nextParams = new URLSearchParams(currentParams.toString());

    if (typeof next.minPrice === "number") {
      nextParams.set("minPrice", String(next.minPrice));
    } else {
      nextParams.delete("minPrice");
    }

    if (typeof next.maxPrice === "number") {
      nextParams.set("maxPrice", String(next.maxPrice));
    } else {
      nextParams.delete("maxPrice");
    }

    navigateWithParams(basePath, nextParams);
  };

  const applyCategory = (href: string) => {
    navigateWithParams(href, new URLSearchParams(currentParams.toString()));
  };

  const isPriceRangeActive = (range: { minPrice?: string; maxPrice?: string }) =>
    (range.minPrice ?? null) === (minPrice ?? null) &&
    (range.maxPrice ?? null) === (maxPrice ?? null);

  return (
    <>
      <div className="flex items-center gap-6 px-4 py-5 text-sm text-foreground">
        <button
          type="button"
          onClick={() => setOpenSheet("filters")}
          className="inline-flex items-center gap-2 underline"
        >
          <span className="h-4 w-4">
            <FiltersIcon />
          </span>
          Filtrar
        </button>
        <button
          type="button"
          onClick={() => setOpenSheet("sort")}
          className="inline-flex items-center gap-2 underline"
        >
          <span className="h-4 w-4">
            <SortIcon />
          </span>
          Ordenar
        </button>
      </div>

      {openSheet ? (
        <>
          <button
            type="button"
            aria-label="Cerrar panel"
            className="fixed inset-0 z-[90] bg-black/40 lg:hidden"
            onClick={() => setOpenSheet(null)}
          />

          <div className="fixed inset-x-0 bottom-0 z-[100] max-h-[70dvh] overflow-hidden rounded-t-[24px] bg-white lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
              <h2 className="text-base font-medium text-foreground">
                {openSheet === "sort" ? "Ordenar" : "Filtros"}
              </h2>
              <button
                type="button"
                aria-label="Cerrar panel"
                className="inline-flex h-10 w-10 items-center justify-center text-foreground"
                onClick={() => setOpenSheet(null)}
              >
                X
              </button>
            </div>

            <div className="max-h-[calc(70dvh-4rem)] overflow-y-auto">
              {openSheet === "sort" ? (
                <div className="py-3">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => applySort(option.value)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm text-foreground transition hover:bg-neutral-50"
                    >
                      <span>{option.label}</span>
                      <CheckIcon visible={activeSort === option.value} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6 px-5 py-5">
                  <div className="space-y-3">
                    <h3 className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                      Disponibilidad
                    </h3>
                    <button
                      type="button"
                      onClick={applyStock}
                      className="flex w-full items-center justify-between text-left text-sm text-foreground"
                    >
                      <span>En stock</span>
                      <CheckIcon visible={inStock} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                      Precio
                    </h3>
                    <button
                      type="button"
                      onClick={() => applyPrice({ maxPrice: 10000 })}
                      className="flex w-full items-center justify-between text-left text-sm text-foreground"
                    >
                      <span>Hasta $10.000</span>
                      <CheckIcon visible={isPriceRangeActive({ maxPrice: "10000" })} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPrice({ minPrice: 10000, maxPrice: 30000 })}
                      className="flex w-full items-center justify-between text-left text-sm text-foreground"
                    >
                      <span>$10.000 a $30.000</span>
                      <CheckIcon
                        visible={isPriceRangeActive({ minPrice: "10000", maxPrice: "30000" })}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPrice({ minPrice: 30000 })}
                      className="flex w-full items-center justify-between text-left text-sm text-foreground"
                    >
                      <span>Mas de $30.000</span>
                      <CheckIcon visible={isPriceRangeActive({ minPrice: "30000" })} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                      Categoria
                    </h3>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => applyCategory(category.href)}
                        className="flex w-full items-center justify-between text-left text-sm text-foreground"
                      >
                        <span>{category.title}</span>
                        <CheckIcon visible={category.slug === activeCategorySlug} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-[calc(env(safe-area-inset-bottom)+32px)] bg-white" />
          </div>
          <div className="fixed inset-x-0 bottom-0 z-[101] h-[calc(env(safe-area-inset-bottom)+32px)] bg-white lg:hidden" />
        </>
      ) : null}
    </>
  );
}
