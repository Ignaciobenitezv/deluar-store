import Image from "next/image";
import Link from "next/link";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const HEAD = "px-3 py-2.5 text-left font-semibold whitespace-nowrap first:pl-5 last:pr-5";
const CELL = "px-3 py-3 align-middle whitespace-nowrap text-[13px] text-text-secondary first:pl-5 last:pr-5";

/** Where the abandoned carts came from, as a ranked bar list. */
export function SourceBars({
  rows,
}: {
  rows: { source: string; count: number; share: number }[];
}) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-5 pb-5")}>
        Sin fuentes registradas: no hubo abandonos en el período.
      </p>
    );
  }

  const leader = Math.max(...rows.map((row) => row.count), 0);

  return (
    <ul className="px-5 pb-5">
      {rows.map((row) => (
        <li key={row.source} className="flex items-center gap-4 py-[9px]">
          <span className="w-[84px] shrink-0 truncate text-[13px] text-text-primary">
            {row.source}
          </span>
          <span
            aria-hidden
            className="block h-[10px] min-w-0 flex-1 overflow-hidden rounded-[3px] bg-surface-elevated"
          >
            <span
              className="block h-full rounded-[3px]"
              style={{
                width: `${leader > 0 ? Math.max((row.count / leader) * 100, 2) : 2}%`,
                backgroundColor: overviewColor.action,
              }}
            />
          </span>
          <span className="w-8 shrink-0 text-right text-[13.5px] font-semibold tabular-nums text-text-primary">
            {formatDashboardNumber(row.count)}
          </span>
          <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-text-secondary">
            {row.share.toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

type AbandonedProduct = {
  productId: string;
  productName: string;
  imageUrl: string | null;
  abandonedCarts: number;
};

export function AbandonedProductsTable({
  rows,
  total,
}: {
  rows: AbandonedProduct[];
  total: number;
}) {
  if (rows.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-5 pb-5")}>
        Ningún producto quedó en un carrito abandonado durante el período.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y border-border bg-surface-elevated">
          <th scope="col" className={cn(overviewUi.label, HEAD, "w-8")}>
            #
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD)}>
            Producto
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            Carritos
          </th>
          <th scope="col" className={cn(overviewUi.label, HEAD, "text-right")}>
            %
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.productId} className="border-b border-border last:border-b-0">
            <td className={cn(CELL, "tabular-nums text-text-secondary")}>{index + 1}</td>
            <td className={cn(CELL, "max-w-0 whitespace-normal")}>
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[5px] border border-border bg-surface-elevated"
                >
                  {row.imageUrl ? (
                    <Image src={row.imageUrl} alt="" fill sizes="32px" className="object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 truncate text-[13px] text-text-primary">
                  {row.productName}
                </span>
              </span>
            </td>
            <td className={cn(CELL, "text-right font-semibold tabular-nums text-text-primary")}>
              {formatDashboardNumber(row.abandonedCarts)}
            </td>
            <td className={cn(CELL, "text-right tabular-nums text-text-secondary")}>
              {total > 0 ? `${((row.abandonedCarts / total) * 100).toFixed(0)}%` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const STAGE_CHIP: Record<string, { bg: string; ink: string }> = {
  CART_ABANDONED: { bg: "var(--admin-info-soft)", ink: overviewColor.action },
  CHECKOUT_ABANDONED: { bg: "var(--admin-danger-soft)", ink: overviewColor.negative },
};

type CartRow = {
  cartId: string;
  abandonedAtLabel: string;
  customerLabel: string;
  productSummary: string;
  subtotal: number;
  status: string;
  stageLabel: string;
  sourceLabel: string;
  campaignLabel: string;
};

/**
 * The dense list the reference shows. With no results the head stays so the
 * reader knows what the module will hold, and the empty row is one line tall.
 */
export function AbandonedCartsTable({ rows }: { rows: CartRow[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y border-border bg-surface-elevated">
          {["Fecha", "Cliente", "Productos", "Valor", "Etapa", "Fuente", "Campaña", ""].map(
            (header, index) => (
              <th
                key={header || index}
                scope="col"
                className={cn(
                  overviewUi.label,
                  HEAD,
                  (header === "Valor" || header === "Productos") && "text-right",
                )}
              >
                {header || <span className="sr-only">Acciones</span>}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-5 py-6 text-center text-[12.5px] text-text-secondary">
              No hubo carritos abandonados en el período con estos filtros.
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const chip = STAGE_CHIP[row.status] ?? STAGE_CHIP.CART_ABANDONED;

            return (
              <tr key={row.cartId} className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-elevated">
                <td className={cn(CELL, "tabular-nums text-text-primary")}>{row.abandonedAtLabel}</td>
                <td className={cn(CELL, "max-w-0")}>
                  <span className="block truncate text-text-primary">{row.customerLabel}</span>
                </td>
                <td className={cn(CELL, "text-right tabular-nums")}>{row.productSummary}</td>
                <td className={cn(CELL, "text-right font-semibold tabular-nums text-text-primary")}>
                  {formatDashboardPrice(row.subtotal)}
                </td>
                <td className={CELL}>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[12px] font-medium"
                    style={{ backgroundColor: chip.bg, color: chip.ink }}
                  >
                    {row.stageLabel}
                  </span>
                </td>
                <td className={CELL}>{row.sourceLabel}</td>
                <td className={cn(CELL, "text-text-secondary")}>{row.campaignLabel}</td>
                <td className={cn(CELL, "text-right")}>
                  <Link
                    href={`/admin/dashboard/abandoned-carts/${row.cartId}`}
                    className="inline-flex items-center rounded-[6px] border border-border px-2.5 py-[5px] text-[12px] font-medium text-text-primary transition-colors hover:border-border hover:text-text-primary"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
