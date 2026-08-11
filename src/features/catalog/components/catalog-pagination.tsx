"use client";

import Link from "next/link";
import type { CatalogPagination, CatalogSearchParamsSource } from "@/features/catalog/pagination";
import {
  buildCatalogPageHref,
  buildCatalogPageWindow,
} from "@/features/catalog/pagination";

type CatalogPaginationProps = {
  basePath: string;
  searchParams: CatalogSearchParamsSource;
  pagination: CatalogPagination;
};

function PaginationLink({
  href,
  label,
  disabled,
  active,
}: {
  href?: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
}) {
  const baseClassName =
    "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2";

  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        className={`${baseClassName} cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400`}
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${baseClassName} ${
        active
          ? "border-[#A88772] bg-[#A88772] text-[#2f241b]"
          : "border-neutral-200 bg-white text-foreground hover:border-neutral-300 hover:bg-neutral-50"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export function CatalogPaginationControls({
  basePath,
  searchParams,
  pagination,
}: CatalogPaginationProps) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  const pageWindow = buildCatalogPageWindow(pagination.currentPage, pagination.totalPages);
  const buildHref = (page: number) =>
    `${buildCatalogPageHref(basePath, searchParams, page)}#catalog-grid`;

  return (
    <nav aria-label="Paginacion del catalogo" className="space-y-4">
      <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-neutral-200 bg-white px-4 py-4 text-sm text-foreground shadow-sm sm:flex-row">
        <div className="flex items-center gap-2">
          <PaginationLink
            href={pagination.hasPrevious ? buildHref(pagination.previousPage ?? 1) : undefined}
            label="Anterior"
            disabled={!pagination.hasPrevious}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {pageWindow.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex min-h-10 min-w-10 items-center justify-center px-2 text-neutral-400"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <PaginationLink
                key={item}
                href={buildHref(item)}
                label={String(item)}
                active={item === pagination.currentPage}
              />
            ),
          )}
        </div>

        <div className="flex items-center gap-2">
          <PaginationLink
            href={pagination.hasNext ? buildHref(pagination.nextPage ?? pagination.totalPages) : undefined}
            label="Siguiente"
            disabled={!pagination.hasNext}
          />
        </div>
      </div>

      <p className="text-center text-xs uppercase tracking-[0.18em] text-neutral-500">
        Página {pagination.currentPage} de {pagination.totalPages}
      </p>
    </nav>
  );
}
