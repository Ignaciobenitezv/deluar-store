import Image from "next/image";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const HEAD = "px-3 py-2.5 text-left font-semibold whitespace-nowrap first:pl-5 last:pr-5";
const CELL = "px-3 py-3 align-middle whitespace-nowrap text-[13px] text-text-secondary first:pl-5 last:pr-5";

function Thumb({ url }: { url: string | null }) {
  return (
    <span
      aria-hidden
      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[6px] border border-border bg-surface-elevated"
    >
      {url ? <Image src={url} alt="" fill sizes="36px" className="object-cover" /> : null}
    </span>
  );
}

type RankingRow = {
  productId: string;
  productName: string;
  imageUrl: string | null;
  value: number;
  share: number;
};

/** The reference's ranking: a compact table, not a chart and not cards. */
export function ProductRanking({
  rows,
  valueHeader,
  money = false,
  emptyMessage,
}: {
  rows: RankingRow[];
  valueHeader: string;
  money?: boolean;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className={cn(overviewUi.note, "px-5 pb-5")}>{emptyMessage}</p>;
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
            {valueHeader}
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "w-16 text-right")}>
            %
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.productId} className="border-b border-border last:border-b-0">
            <td className={cn(CELL, "tabular-nums text-text-secondary")}>{index + 1}</td>
            <td className={cn(CELL, "max-w-0")}>
              <span className="flex min-w-0 items-center gap-3">
                <Thumb url={row.imageUrl} />
                <span className="min-w-0 truncate text-[13px] text-text-primary">
                  {row.productName}
                </span>
              </span>
            </td>
            <td className={cn(CELL, "text-right font-semibold tabular-nums text-text-primary")}>
              {money ? formatDashboardPrice(row.value) : formatDashboardNumber(row.value)}
            </td>
            <td className={cn(CELL, "text-right tabular-nums text-text-secondary")}>
              {row.share.toFixed(0)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type StockRow = {
  productId: string;
  productName: string;
  stock: number;
  status: "low_stock" | "out_of_stock";
};

export function StockTable({ rows }: { rows: StockRow[] }) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-5 pb-5")}>
        Ningún producto está por debajo del umbral de stock.
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
          <th scope="col" className={cn(overviewUi.label, HEAD, "w-20 text-right")}>
            Stock
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "w-28 text-right")}>
            Estado
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const out = row.status === "out_of_stock";

          return (
            <tr key={row.productId} className="border-b border-border last:border-b-0">
              <td className={cn(CELL, "tabular-nums text-text-secondary")}>{index + 1}</td>
              <td className={cn(CELL, "max-w-0")}>
                <span className="block truncate text-[13px] text-text-primary">
                  {row.productName}
                </span>
              </td>
              <td
                className={cn(CELL, "text-right font-semibold tabular-nums")}
                style={{ color: out ? overviewColor.negative : overviewColor.warning }}
              >
                {formatDashboardNumber(row.stock)}
              </td>
              <td className={cn(CELL, "text-right")}>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[12px] font-medium"
                  style={{
                    backgroundColor: out ? "var(--admin-danger-soft)" : "var(--admin-warning-soft)",
                    color: out ? overviewColor.negative : overviewColor.warning,
                  }}
                >
                  {out ? "Sin stock" : "Stock bajo"}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type FunnelRow = {
  productId: string;
  productName: string;
  views: number;
  addToCart: number;
  purchases: number;
};

/**
 * Replaces the reference's "new vs returning" block, which needs a customer to
 * product join the services do not compute. This asks the same question — which
 * product needs attention — with the journey we do record.
 */
export function ProductFunnelBars({ rows }: { rows: FunnelRow[] }) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-5 pb-5")}>
        Ningún producto registró visitas en el período.
      </p>
    );
  }

  const max = Math.max(...rows.map((row) => row.views), 1);

  return (
    <div className="px-5 pb-5">
      {rows.map((row) => {
        const viewWidth = (row.views / max) * 100;
        const cartWidth = (row.addToCart / max) * 100;
        const buyWidth = (row.purchases / max) * 100;

        return (
          <div key={row.productId} className="flex items-center gap-4 py-[9px]">
            <span className="w-[132px] shrink-0 truncate text-[13px] text-text-primary">
              {row.productName}
            </span>
            <span
              aria-hidden
              className="relative block h-[12px] min-w-0 flex-1 overflow-hidden rounded-[3px] bg-background"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-[3px]"
                style={{ width: `${viewWidth}%`, backgroundColor: "#c3d0f1" }}
              />
              <span
                className="absolute inset-y-0 left-0 rounded-[3px]"
                style={{ width: `${cartWidth}%`, backgroundColor: overviewColor.seriesTertiary }}
              />
              <span
                className="absolute inset-y-0 left-0 rounded-[3px]"
                style={{ width: `${buyWidth}%`, backgroundColor: overviewColor.action }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-[12.5px] tabular-nums text-text-secondary">
              {formatDashboardNumber(row.views)}
            </span>
            <span className="w-10 shrink-0 text-right text-[12.5px] tabular-nums text-text-secondary">
              {formatDashboardNumber(row.addToCart)}
            </span>
            <span className="w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums text-text-primary">
              {formatDashboardNumber(row.purchases)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ProductFunnelLegend() {
  return (
    <div className="flex shrink-0 items-center gap-4 text-[12px] text-text-secondary">
      <span className="flex items-center gap-2">
        <span aria-hidden className="h-[8px] w-[8px] rounded-full bg-[#c3d0f1]" />
        Vistas
      </span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-[8px] w-[8px] rounded-full"
          style={{ backgroundColor: overviewColor.seriesTertiary }}
        />
        Carrito
      </span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-[8px] w-[8px] rounded-full"
          style={{ backgroundColor: overviewColor.action }}
        />
        Compras
      </span>
    </div>
  );
}
