"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDashboardNumber } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { ADMIN_LOW_STOCK_THRESHOLD } from "@/features/admin/products/lib/product-filters";
import { AdminInventoryStockStepper } from "./admin-inventory-stock-stepper";
import { useAdminInventoryPendingChanges } from "../context/admin-inventory-pending-changes-context";
import type { AdminInventoryItem, AdminInventoryStockRow, AdminInventoryStockTone } from "../lib/inventory-item";

type AdminInventoryRowProps = {
  item: AdminInventoryItem;
  variant: "mobile" | "desktop";
};

function stockToneClasses(tone: AdminInventoryStockTone) {
  switch (tone) {
    case "success":
      return "border-success/25 bg-success-soft text-success";
    case "warning":
      return "border-warning/25 bg-warning-soft text-warning";
    case "danger":
    default:
      return "border-danger/25 bg-danger-soft text-danger";
  }
}

function resolveTone(stock: number): AdminInventoryStockTone {
  if (stock <= 0) return "danger";
  return stock <= ADMIN_LOW_STOCK_THRESHOLD ? "warning" : "success";
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-150", expanded && "rotate-180")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3 2 6l3 3" />
      <path d="M2 6h7.5A3.5 3.5 0 0 1 13 9.5v0A3.5 3.5 0 0 1 9.5 13H6" />
    </svg>
  );
}

/** One editable stock row (base product or a single variant) — shared shape
 * between the desktop table and the mobile card, since the behavior (read
 * the pending override, render the stepper, show "Antes: X ↺" when
 * changed) never differs, only the surrounding layout does. */
function StockRowControl({
  productId,
  productTitle,
  row,
  size = "md",
}: {
  productId: string;
  productTitle: string;
  row: AdminInventoryStockRow;
  size?: "sm" | "md";
}) {
  const { getPendingRow, setRowStock, undoRow } = useAdminInventoryPendingChanges();
  const pending = getPendingRow(productId, row.key);
  const displayedStock = pending?.newStock ?? row.stock;
  const isChanged = pending !== undefined;

  return (
    <div className="flex flex-col gap-1">
      <AdminInventoryStockStepper
        value={displayedStock}
        size={size}
        onChange={(nextValue) =>
          setRowStock({
            productId,
            productTitle,
            rowKey: row.key,
            kind: row.kind,
            rowLabel: row.label,
            originalStock: pending?.originalStock ?? row.stock,
            newStock: nextValue,
          })
        }
      />

      {isChanged ? (
        <div className="flex items-center gap-1.5 text-[11px] leading-4">
          <span className="inline-flex items-center rounded-full border border-warning/25 bg-warning-soft px-1.5 py-0.5 font-semibold uppercase tracking-[0.1em] text-warning">
            Editado
          </span>
          <span className="text-text-secondary">Antes: {formatDashboardNumber(pending.originalStock)}</span>
          <button
            type="button"
            onClick={() => undoRow(productId, row.key)}
            className="inline-flex items-center gap-1 text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
          >
            <UndoIcon />
            Deshacer
          </button>
        </div>
      ) : null}

      {pending?.issue ? (
        <p className="max-w-[16rem] text-[11px] leading-4 text-danger">{pending.issue.message}</p>
      ) : null}
    </div>
  );
}

/** The main row's Stock cell: the stepper directly for a simple product, or
 * a non-editable computed total + expand toggle for a variant product — the
 * total is derived live from every variant row's *displayed* (possibly
 * pending) value, so it updates immediately as Lucila edits a variant,
 * without waiting for a save. */
function useComputedVariantTotal(item: AdminInventoryItem) {
  const { getPendingRow } = useAdminInventoryPendingChanges();

  if (!item.hasVariants) {
    return item.totalStock;
  }

  return item.rows.reduce((sum, row) => {
    const pending = getPendingRow(item.id, row.key);
    return sum + (pending?.newStock ?? row.stock);
  }, 0);
}

function VariantSummary({ item, onToggle, expanded }: { item: AdminInventoryItem; onToggle: () => void; expanded: boolean }) {
  const total = useComputedVariantTotal(item);
  const tone = resolveTone(total);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex w-full max-w-[12rem] flex-col items-start gap-0.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left transition-colors hover:bg-surface-elevated"
    >
      <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-4", stockToneClasses(tone))}>
        {formatDashboardNumber(total)} unidades
      </span>
      <span className="text-[10.5px] leading-4 text-text-secondary">Stock total con variantes</span>
      <span className="flex w-full items-center justify-between gap-2 text-[11px] font-medium leading-4 text-text-primary">
        {item.variantCount} {item.variantCount === 1 ? "variante" : "variantes"}
        <ChevronIcon expanded={expanded} />
      </span>
    </button>
  );
}

/** Fixed square, never driven by the source image's natural dimensions —
 * this is the exact bug that made the row explode in height before: a
 * previous "md" variant used `aspect-square w-full`, which stretched to the
 * table column's width (hundreds of px) with no cap. One size, everywhere,
 * matching /admin/productos' own desktop thumbnail treatment (object-cover
 * inside a fixed, bordered box). */
function ProductThumbnail({ imageUrl, imageAlt }: { imageUrl: string | null; imageAlt: string }) {
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-elevated">
      {imageUrl ? (
        <Image src={imageUrl} alt={imageAlt} fill sizes="64px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface-elevated text-[8px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
          Sin imagen
        </div>
      )}
    </div>
  );
}

export function AdminInventoryRow({ item, variant }: AdminInventoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const baseRow = !item.hasVariants ? item.rows[0] : null;

  if (variant === "mobile") {
    return (
      <article className="border-b border-border py-3 last:border-b-0">
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-3">
          <ProductThumbnail imageUrl={item.imageUrl} imageAlt={item.imageAlt} />

          <div className="flex min-w-0 flex-col gap-0.5">
            <Link href={`/admin/productos/${item.id}`} className="min-w-0 text-sm font-semibold leading-5 text-text-primary line-clamp-2 hover:underline">
              {item.title}
            </Link>
            <p className="truncate text-xs text-text-secondary">/{item.slug}</p>
            <p className="truncate text-xs text-text-secondary">
              {item.categoryLabel}
              {item.subcategoryLabel ? ` · ${item.subcategoryLabel}` : ""} · {item.priceLabel}
            </p>
          </div>
        </div>

        <div className="mt-3">
          {baseRow ? (
            <StockRowControl productId={item.id} productTitle={item.title} row={baseRow} size="sm" />
          ) : (
            <VariantSummary item={item} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
          )}
        </div>

        {item.hasVariants && expanded ? (
          <div className="mt-3 space-y-3 rounded-xl border border-border bg-surface-elevated px-3 py-3">
            {item.rows.map((row) => (
              <div key={row.key} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-text-primary">{row.label}</p>
                  {row.sku ? <p className="text-[11px] text-text-secondary">{row.sku}</p> : null}
                  {row.isActive === false ? (
                    <span className="mt-0.5 inline-flex rounded-md border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                      Inactiva
                    </span>
                  ) : null}
                </div>
                <StockRowControl productId={item.id} productTitle={item.title} row={row} size="sm" />
              </div>
            ))}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <>
      <tr className="border-t border-border align-top transition-colors duration-150 hover:bg-surface-elevated">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <ProductThumbnail imageUrl={item.imageUrl} imageAlt={item.imageAlt} />
            <div className="min-w-0">
              <Link
                href={`/admin/productos/${item.id}`}
                className="block text-[13.5px] font-semibold leading-5 text-text-primary line-clamp-2 transition-colors hover:underline"
              >
                {item.title}
              </Link>
              <p className="mt-0.5 truncate text-xs text-text-secondary">/{item.slug}</p>
            </div>
          </div>
        </td>

        <td className="px-4 py-3 align-middle">
          <p className="truncate font-medium text-text-primary">{item.categoryLabel}</p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">{item.subcategoryLabel || "Sin subcategoría"}</p>
        </td>

        <td className="px-4 py-3 align-middle">
          <p className="font-semibold text-text-primary">{item.priceLabel}</p>
        </td>

        <td className="px-4 py-3 align-middle">
          {baseRow ? (
            <StockRowControl productId={item.id} productTitle={item.title} row={baseRow} />
          ) : (
            <VariantSummary item={item} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
          )}
        </td>
      </tr>

      {item.hasVariants && expanded
        ? item.rows.map((row) => (
            <tr key={row.key} className="border-t border-dashed border-border bg-surface-elevated/40 align-middle">
              <td className="py-2 pl-[5.75rem] pr-4" colSpan={2}>
                <p className="truncate text-[12.5px] font-medium text-text-primary">↳ {row.label}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {row.sku ? <p className="truncate text-[11px] text-text-secondary">{row.sku}</p> : null}
                  {row.isActive === false ? (
                    <span className="inline-flex shrink-0 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                      Inactiva
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2">
                <StockRowControl productId={item.id} productTitle={item.title} row={row} size="sm" />
              </td>
            </tr>
          ))
        : null}
    </>
  );
}
