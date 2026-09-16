import Image from "next/image";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { formatDashboardNumber, formatDashboardPercent } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const HEAD = "px-3 py-3 text-left font-semibold first:pl-6 last:pr-6";

/** A rate reads as a chip so the column scans as state, not as more numbers. */
function RateChip({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[13px] text-text-secondary">—</span>;
  }

  const active = value > 0;

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[3px] text-[12.5px] font-semibold tabular-nums"
      style={{
        backgroundColor: active ? overviewColor.positiveSoft : "var(--admin-surface-elevated)",
        color: active ? overviewColor.positive : overviewColor.muted,
      }}
    >
      {formatDashboardPercent(value)}
    </span>
  );
}
const CELL = "px-3 py-3.5 align-middle first:pl-6 last:pr-6";

type SourceRow = {
  source: string;
  sessions: number;
  addToCart: number;
  checkoutStarted: number;
  purchases: number;
  conversionRate: number;
};

export function SourceConversionTable({ rows }: { rows: SourceRow[] }) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-6 pb-6")}>
        Sin sesiones atribuidas a una fuente en el período.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y border-border bg-surface-elevated">
          <th scope="col" className={cn(overviewUi.label, HEAD, "w-9")}>
            #
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD)}>
            Fuente
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Sesiones
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Add to cart
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Checkouts
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Compras
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Conversión
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.source} className="border-b border-border last:border-b-0">
            <td className={cn(CELL, "text-[12.5px] tabular-nums text-text-secondary")}>{index + 1}</td>
            <td className={cn(CELL, "max-w-0")}>
              <span className="block truncate text-[13px] text-text-primary">{row.source}</span>
            </td>
            <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
              {formatDashboardNumber(row.sessions)}
            </td>
            <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
              {formatDashboardNumber(row.addToCart)}
            </td>
            <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
              {formatDashboardNumber(row.checkoutStarted)}
            </td>
            <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
              {formatDashboardNumber(row.purchases)}
            </td>
            <td className={cn(CELL, "text-right")}>
              <RateChip value={row.conversionRate} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type ViewedProductRow = {
  productId: string;
  productName: string;
  imageUrl: string | null;
  views: number;
  addToCart: number;
  viewToCartRate: number | null;
};

export function ViewedProductsTable({ rows }: { rows: ViewedProductRow[] }) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-6 pb-6")}>
        Ningún producto registró vistas en el período.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y border-border bg-surface-elevated">
          <th scope="col" className={cn(overviewUi.label, HEAD, "w-9")}>
            #
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD)}>
            Producto
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Vistas
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Add to cart
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Vista → carrito
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.productId} className="border-b border-border last:border-b-0">
            <td className={cn(CELL, "text-[12.5px] tabular-nums text-text-secondary")}>{index + 1}</td>
            <td className={cn(CELL, "max-w-0")}>
              <span className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border bg-surface-elevated">
                  {row.imageUrl ? (
                    <Image src={row.imageUrl} alt="" fill sizes="32px" className="object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 truncate text-[13px] text-text-primary">{row.productName}</span>
              </span>
            </td>
            <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
              {formatDashboardNumber(row.views)}
            </td>
            <td className={cn(CELL, "text-right text-[13px] tabular-nums text-text-secondary")}>
              {formatDashboardNumber(row.addToCart)}
            </td>
            <td className={cn(CELL, "text-right")}>
              <RateChip value={row.viewToCartRate} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
