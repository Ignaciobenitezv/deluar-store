import Link from "next/link";
import { ledgerUi } from "./ledger-ui";
import { cn } from "@/lib/utils";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";

type LedgerPaginationProps = {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalEntries: number;
  buildHref: (page: number) => string;
};

function PagerLink({
  href,
  disabled,
  children,
  label,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
  label: string;
}) {
  const className = cn(
    "rounded-[6px] border px-3.5 py-[7px] text-[12.5px] font-medium transition-colors",
    disabled
      ? "cursor-not-allowed border-border bg-transparent text-text-secondary"
      : "border-border bg-surface text-text-primary hover:border-border hover:text-text-primary",
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} aria-label={label} rel="nofollow">
      {children}
    </Link>
  );
}

export function LedgerPagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  totalEntries,
  buildHref,
}: LedgerPaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3.5">
      <p className={ledgerUi.note}>
        Mostrando{" "}
        <span className="tabular-nums text-text-primary">
          {formatDashboardNumber(rangeStart)}–{formatDashboardNumber(rangeEnd)}
        </span>{" "}
        de{" "}
        <span className="tabular-nums text-text-primary">
          {formatDashboardNumber(totalEntries)}
        </span>{" "}
        {totalEntries === 1 ? "orden" : "órdenes"}
      </p>

      {totalPages > 1 ? (
        <div className="flex items-center gap-3">
          <p className={ledgerUi.note}>
            Página <span className="tabular-nums text-text-primary">{page}</span> de{" "}
            <span className="tabular-nums text-text-primary">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <PagerLink href={buildHref(page - 1)} disabled={page <= 1} label="Página anterior">
              Anterior
            </PagerLink>
            <PagerLink
              href={buildHref(page + 1)}
              disabled={page >= totalPages}
              label="Página siguiente"
            >
              Siguiente
            </PagerLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
