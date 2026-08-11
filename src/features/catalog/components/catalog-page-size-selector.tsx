"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  buildCatalogPageSizeHref,
  CATALOG_PAGE_SIZES,
  DEFAULT_CATALOG_PAGE_SIZE,
  parseCatalogPageSizeSearchParam,
} from "@/features/catalog/pagination";
import { cn } from "@/lib/utils";

type CatalogPageSizeSelectorProps = {
  variant?: "desktop" | "mobile";
};

export function CatalogPageSizeSelector({ variant = "desktop" }: CatalogPageSizeSelectorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPageSize = parseCatalogPageSizeSearchParam(searchParams.get("perPage") ?? undefined);
  const isDesktop = variant === "desktop";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isDesktop
          ? "text-sm text-foreground"
          : "flex-wrap px-4 text-sm text-foreground lg:hidden",
      )}
    >
      <span
        className={cn(
          "text-[11px] uppercase tracking-[0.15em] text-neutral-500",
          !isDesktop && "shrink-0",
        )}
      >
        Mostrar
      </span>

      <div
        className={cn(
          "inline-flex items-center rounded-full border border-neutral-200 bg-white p-1 shadow-sm",
          !isDesktop && "flex-wrap gap-1",
        )}
      >
        {CATALOG_PAGE_SIZES.map((pageSize) => {
          const isActive = currentPageSize === pageSize;
          const href = `${buildCatalogPageSizeHref(pathname, searchParams, pageSize)}#catalog-grid`;

          return (
            <Link
              key={pageSize}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-8 min-w-10 items-center justify-center rounded-full px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
                isActive
                  ? "bg-[#A88772] text-[#2f241b]"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-foreground",
              )}
            >
              {pageSize}
            </Link>
          );
        })}
      </div>

      {currentPageSize !== DEFAULT_CATALOG_PAGE_SIZE ? (
        <span className="sr-only">Cantidad seleccionada: {currentPageSize} productos por página</span>
      ) : null}
    </div>
  );
}
