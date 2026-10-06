import Link from "next/link";
import { buildCatalogPageWindow, type CatalogPageWindowItem } from "@/features/catalog/pagination";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { AdminPaginationJumpMenu } from "./admin-pagination-jump-menu";
import { cn } from "@/lib/utils";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  /** Builds the href for a given target page. Each screen supplies its own
   * filter-aware builder (buildAdminProductsHref, buildOrdersHref, etc.) so
   * every other query param survives a page change untouched. */
  buildHref: (page: number) => string;
  className?: string;
};

const pageItemBaseClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-xl border px-2 text-xs font-semibold transition-colors duration-150 sm:h-9 sm:min-w-9 sm:px-3 sm:text-sm";

function PageNumberLink({ href, page, active }: { href: string; page: number; active: boolean }) {
  if (active) {
    return (
      <span aria-current="page" className={cn(pageItemBaseClass, dashboardUi.primaryAction, "pointer-events-none")}>
        {page}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(pageItemBaseClass, "border-border bg-surface text-text-primary hover:bg-surface-elevated")}
    >
      {page}
    </Link>
  );
}

/**
 * Describes the *hidden* range a given ellipsis stands in for, from its
 * numeric neighbors in the same window array — e.g. "entre 2 y 9" for the
 * `1, "ellipsis", 10...` case. Falls back to a generic label on either edge
 * (shouldn't normally happen: an ellipsis always sits between two numbers).
 */
function describeEllipsisRange(items: CatalogPageWindowItem[], index: number) {
  const previous = items[index - 1];
  const next = items[index + 1];

  if (typeof previous === "number" && typeof next === "number" && next - previous > 1) {
    return `Elegir página, entre ${previous + 1} y ${next - 1}`;
  }

  return "Elegir página";
}

function parseHrefForClient(href: string) {
  const url = new URL(href, "http://admin-pagination.internal");
  return {
    pathname: url.pathname,
    searchEntries: [...url.searchParams.entries()] as [string, string][],
  };
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? <path d="M12 4.5 6.5 10l5.5 5.5" /> : <path d="M8 4.5 13.5 10 8 15.5" />}
    </svg>
  );
}

function StepLink({
  href,
  disabled,
  direction,
  label,
}: {
  href: string;
  disabled: boolean;
  direction: "left" | "right";
  label: string;
}) {
  const className = cn(
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors duration-150 sm:h-9 sm:px-3 sm:text-sm",
    disabled
      ? "pointer-events-none border-border bg-surface-elevated text-text-secondary"
      : "border-border bg-surface text-text-primary hover:bg-surface-elevated",
  );

  const content =
    direction === "left" ? (
      <>
        <ChevronIcon direction="left" />
        <span className="hidden sm:inline">Anterior</span>
      </>
    ) : (
      <>
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronIcon direction="right" />
      </>
    );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={className} aria-label={label}>
      {content}
    </Link>
  );
}

/**
 * Shared numbered pagination for the Admin panel, built on the same
 * ellipsis-windowing algorithm the storefront catalog already uses
 * (`buildCatalogPageWindow`) so the two never drift into competing
 * implementations. Desktop (≥ sm) shows a 5-page window, e.g.
 * "‹ 1 … 10 11 [12] 13 14 … 20 ›"; below `sm` the same algorithm runs with a
 * 1-page window ("‹ 1 … 12 … 20 ›") so the row never needs horizontal
 * scrolling on a phone.
 */
export function AdminPagination({ page, totalPages, buildHref, className }: AdminPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;
  const desktopWindow = buildCatalogPageWindow(page, totalPages, 5);
  const mobileWindow = buildCatalogPageWindow(page, totalPages, 1);

  // AdminPaginationJumpMenu is a Client Component, so it can never receive
  // `buildHref` itself (a plain function can't cross the Server → Client
  // boundary) — this runs `buildHref` here, server-side, exactly once for
  // the current page, and hands the menu only the resulting plain
  // pathname/params. The menu reconstructs every other page's href from
  // that locally; every other filter/search param it carries is untouched.
  const { pathname: jumpMenuPathname, searchEntries: jumpMenuSearchEntries } = parseHrefForClient(buildHref(page));

  return (
    <nav aria-label="Paginación" className={cn("flex flex-wrap items-center gap-1.5 sm:gap-2", className)}>
      <StepLink
        href={buildHref(Math.max(1, page - 1))}
        disabled={isFirstPage}
        direction="left"
        label="Página anterior"
      />

      <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
        {mobileWindow.map((item, index) =>
          item === "ellipsis" ? (
            <AdminPaginationJumpMenu
              key={`ellipsis-${index}`}
              currentPage={page}
              totalPages={totalPages}
              pathname={jumpMenuPathname}
              searchEntries={jumpMenuSearchEntries}
              label={describeEllipsisRange(mobileWindow, index)}
            />
          ) : (
            <PageNumberLink key={item} href={buildHref(item)} page={item} active={item === page} />
          ),
        )}
      </div>

      <div className="hidden flex-wrap items-center gap-1.5 sm:flex sm:gap-2">
        {desktopWindow.map((item, index) =>
          item === "ellipsis" ? (
            <AdminPaginationJumpMenu
              key={`ellipsis-${index}`}
              currentPage={page}
              totalPages={totalPages}
              pathname={jumpMenuPathname}
              searchEntries={jumpMenuSearchEntries}
              label={describeEllipsisRange(desktopWindow, index)}
            />
          ) : (
            <PageNumberLink key={item} href={buildHref(item)} page={item} active={item === page} />
          ),
        )}
      </div>

      <StepLink
        href={buildHref(Math.min(totalPages, page + 1))}
        disabled={isLastPage}
        direction="right"
        label="Página siguiente"
      />
    </nav>
  );
}
