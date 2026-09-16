import Link from "next/link";
import { ledgerColor, ledgerRadius, ledgerUi, splitCurrency } from "./ledger-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

type SoldProduct = {
  productId: string;
  productName: string;
  productSlug: string;
  unitsSold: number;
  revenue: number;
};

function Amount({ value }: { value: number }) {
  const { symbol, amount } = splitCurrency(formatDashboardPrice(value));

  return (
    <span className="inline-flex items-start gap-[0.18em] leading-none">
      <span className="mt-[0.2em] text-[11px] font-medium text-text-secondary">{symbol}</span>
      <span className="text-[14px] font-medium tabular-nums tracking-[-0.025em] text-text-primary">
        {amount}
      </span>
    </span>
  );
}

/** The page's single container shape. Everything sits in one of these. */
export function LedgerModule({
  title,
  note,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  note?: string;
  action?: { href: string; label: string; solid?: boolean };
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn("min-w-0 overflow-hidden", ledgerRadius.module, ledgerUi.module, className)}
    >
      <div className={ledgerUi.moduleHead}>
        <div className="min-w-0">
          <h2 className={ledgerUi.moduleTitle}>{title}</h2>
          {note ? <p className={cn(ledgerUi.note, "mt-1")}>{note}</p> : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className={
              action.solid
                ? "shrink-0 rounded-[6px] bg-primary px-3.5 py-[8px] text-[12.5px] font-medium text-white transition-colors hover:brightness-105"
                : cn("shrink-0 text-[12.5px] font-medium", ledgerUi.link)
            }
          >
            {action.label} →
          </Link>
        ) : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function SoldProductsTable({ products }: { products: SoldProduct[] }) {
  if (products.length === 0) {
    return (
      <p className={cn(ledgerUi.note, "px-6 pb-6")}>
        Ninguna orden pagada del período incluye productos.
      </p>
    );
  }

  const leader = products[0].revenue;

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-y border-border bg-surface-elevated">
          <th scope="col" className={cn(ledgerUi.label, "w-9 py-3 pl-6 pr-2 font-semibold")}>
            #
          </th>
          <th scope="col" className={cn(ledgerUi.label, "px-2 py-3 font-semibold")}>
            Producto
          </th>
          <th scope="col" className={cn(ledgerUi.label, "w-[34%] px-3 py-3 font-semibold")}>
            <span className="sr-only">Participación en la facturación</span>
          </th>
          <th scope="col" className={cn(ledgerUi.label, "px-2 py-3 text-right font-semibold")}>
            Unidades
          </th>
          <th
            scope="col"
            className={cn(ledgerUi.label, "py-3 pl-2 pr-6 text-right font-semibold")}
          >
            Facturación
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((product, index) => (
          <tr key={product.productId} className="border-b border-border last:border-b-0">
            <td className="py-3 pl-6 pr-2 text-[12.5px] tabular-nums text-text-secondary">
              {index + 1}
            </td>
            <td className="max-w-0 px-2 py-3">
              <span className="block truncate text-[13.5px] text-text-primary">
                {product.productName}
              </span>
            </td>
            <td className="px-3 py-3">
              {/* Magnitude against the period's leader, on a visible track so a
                  small share still reads as a share rather than as nothing. */}
              <span
                aria-hidden
                className="block h-[9px] w-full overflow-hidden rounded-[2px] bg-surface-elevated"
              >
                <span
                  className="block h-full rounded-[2px]"
                  style={{
                    width: `${leader > 0 ? Math.max((product.revenue / leader) * 100, 2) : 2}%`,
                    backgroundColor: ledgerColor.series,
                  }}
                />
              </span>
            </td>
            <td className="px-2 py-3 text-right text-[14px] tabular-nums text-text-primary">
              {formatDashboardNumber(product.unitsSold)}
            </td>
            <td className="py-3 pl-2 pr-6 text-right">
              <Amount value={product.revenue} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
