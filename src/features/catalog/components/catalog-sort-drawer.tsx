"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CatalogSort } from "@/features/catalog/types";

type CatalogSortDrawerProps = {
  sort?: CatalogSort;
};

const sortOptions: Array<{ label: string; value: CatalogSort }> = [
  { label: "Precio: menor a mayor", value: "price-asc" },
  { label: "Precio: mayor a menor", value: "price-desc" },
  { label: "De la A a la Z", value: "title-asc" },
  { label: "De la Z a la A", value: "title-desc" },
  { label: "Más nuevo al más viejo", value: "newest" },
  { label: "Más viejo al más nuevo", value: "oldest" },
  { label: "Más vendidos", value: "best-selling" },
];

export function CatalogSortDrawer({ sort }: CatalogSortDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const activeSort = sort ?? "best-selling";
  const currentQuery = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const handleSelect = (nextSort: CatalogSort) => {
    const nextQuery = new URLSearchParams(currentQuery.toString());
    nextQuery.set("sort", nextSort);
    nextQuery.delete("page");
    setIsOpen(false);
    router.push(`${pathname}?${nextQuery.toString()}#catalog-grid`);
  };

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    previousActiveElementRef.current?.focus();
    previousActiveElementRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDrawer, isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm text-foreground"
      >
        Ordenar
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 text-neutral-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] hidden lg:block">
          <button
            type="button"
            aria-label="Cerrar ordenar"
            className="absolute inset-0 bg-black/30"
            onClick={closeDrawer}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-sort-drawer-title"
            className="absolute right-0 top-0 h-dvh w-full max-w-[420px] bg-white shadow-xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
              <h2 id="catalog-sort-drawer-title" className="text-base font-medium text-foreground">Ordenar</h2>
              <button
                type="button"
                aria-label="Cerrar ordenar"
                ref={closeButtonRef}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
                onClick={closeDrawer}
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
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm text-foreground transition hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent-strong)]"
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
