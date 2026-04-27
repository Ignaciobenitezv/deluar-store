"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CatalogSort } from "@/features/catalog/types";

type CatalogSortDrawerProps = {
  sort?: CatalogSort;
};

const sortOptions: Array<{ label: string; value: CatalogSort }> = [
  { label: "Precio: menor a mayor", value: "price-asc" },
  { label: "Precio: mayor a menor", value: "price-desc" },
  { label: "A - Z", value: "title-asc" },
  { label: "Z - A", value: "title-desc" },
  { label: "Mas nuevo al mas viejo", value: "newest" },
  { label: "Mas viejo al mas nuevo", value: "oldest" },
  { label: "Mas vendidos", value: "best-selling" },
];

export function CatalogSortDrawer({ sort }: CatalogSortDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const activeSort = sort ?? "best-selling";
  const currentQuery = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const handleSelect = (nextSort: CatalogSort) => {
    const nextQuery = new URLSearchParams(currentQuery.toString());
    nextQuery.set("sort", nextSort);
    setIsOpen(false);
    router.push(`${pathname}?${nextQuery.toString()}`, { scroll: false });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center rounded-full border border-neutral-200 bg-white px-4 text-sm text-foreground"
      >
        Ordenar
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] hidden lg:block">
          <button
            type="button"
            aria-label="Cerrar ordenar"
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-0 h-dvh w-full max-w-[420px] bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
              <h2 className="text-base font-medium text-foreground">Ordenar</h2>
              <button
                type="button"
                aria-label="Cerrar ordenar"
                className="inline-flex h-10 w-10 items-center justify-center text-foreground"
                onClick={() => setIsOpen(false)}
              >
                X
              </button>
            </div>

            <div className="py-4">
              {sortOptions.map((option) => {
                const isActive = activeSort === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm text-foreground transition hover:bg-neutral-50"
                  >
                    <span>{option.label}</span>
                    <span className={isActive ? "text-foreground" : "invisible"}>
                      {"\u2713"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
