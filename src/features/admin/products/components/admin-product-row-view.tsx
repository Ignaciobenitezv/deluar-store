"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminProductQuickEditDialog } from "./admin-product-quick-edit-dialog";
import { formatDashboardDateTime } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { cn } from "@/lib/utils";
import type { AdminProductListItem } from "../types";

type AdminProductRowViewProps = {
  product: AdminProductListItem;
  variant: "mobile" | "desktop";
};

function getStockToneClasses(tone: "neutral" | "success" | "warning" | "danger") {
  switch (tone) {
    case "success":
      return "border-success/25 bg-success-soft text-success";
    case "warning":
      return "border-warning/25 bg-warning-soft text-warning";
    case "danger":
      return "border-danger/25 bg-danger-soft text-danger";
    case "neutral":
    default:
      return "border-border bg-surface text-text-secondary";
  }
}

function visibilityBadgeClasses(visible: boolean) {
  return visible
    ? "border-success/25 bg-success-soft text-success"
    : "border-border bg-surface-elevated text-text-secondary";
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1.75 10s2.75-5.5 8.25-5.5S18.25 10 18.25 10s-2.75 5.5-8.25 5.5S1.75 10 1.75 10Z" />
      <circle cx="10" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const openButtonClass =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-surface text-text-primary transition-colors duration-150 hover:bg-surface-elevated";

export function AdminProductRowView({ product, variant }: AdminProductRowViewProps) {
  const [currentProduct, setCurrentProduct] = useState(product);

  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  if (variant === "mobile") {
    return (
      <article className="border-b border-border py-3 last:border-b-0">
        <div className="grid grid-cols-[6.625rem_minmax(0,1fr)] items-start gap-3">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-border bg-surface-elevated">
            {currentProduct.imageUrl ? (
              <Image src={currentProduct.imageUrl} alt={currentProduct.imageAlt} fill sizes="106px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-elevated text-[9px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                Sin imagen
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/admin/productos/${currentProduct.id}`}
                className="min-w-0 flex-1 text-sm font-semibold leading-5 text-text-primary transition-colors hover:underline line-clamp-2"
              >
                {currentProduct.title}
              </Link>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  visibilityBadgeClasses(currentProduct.visible),
                )}
              >
                {currentProduct.visible ? "Visible" : "Oculto"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Precio</p>
                <p className="mt-0.5 text-sm font-semibold leading-5 text-text-primary">{currentProduct.priceLabel}</p>
                {currentProduct.priceHint ? <p className="mt-0.5 text-xs text-text-secondary">{currentProduct.priceHint}</p> : null}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Stock</p>
                <div className={cn("mt-0.5 inline-flex flex-col items-start", getStockToneClasses(currentProduct.stockTone))}>
                  <span className="whitespace-nowrap text-sm font-semibold leading-5">{currentProduct.stockLabel}</span>
                  {currentProduct.stockHint ? <span className="text-[11px] font-normal leading-4 opacity-75">{currentProduct.stockHint}</span> : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="min-w-0 flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Variantes</p>
            <p className="text-[11px] leading-4 text-text-primary">{currentProduct.variantLabel}</p>
          </div>

          <div className="min-w-0 flex flex-col gap-0.5 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Actualizado</p>
            <p className="text-[11px] leading-4 whitespace-nowrap text-text-secondary">{formatDashboardDateTime(new Date(currentProduct.updatedAt))}</p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <Link href={`/admin/productos/${currentProduct.id}`} className={cn("h-9 px-3.5 text-[11px] font-semibold", openButtonClass)}>
            <EyeIcon />
            Abrir
          </Link>
          <div className="shrink-0">
            <AdminProductQuickEditDialog
              product={currentProduct}
              onProductUpdated={(updatedProduct) => setCurrentProduct(updatedProduct)}
              triggerLabel="Edición rápida"
              compactTrigger
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <tr className="border-t border-border align-top transition-colors duration-150 hover:bg-surface-elevated">
      <td className="px-4 py-4">
        <div className="flex items-start gap-3.5">
          <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-elevated">
            {currentProduct.imageUrl ? (
              <Image src={currentProduct.imageUrl} alt={currentProduct.imageAlt} fill sizes="56px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-elevated text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                Sin imagen
              </div>
            )}
          </div>

          <div className="min-w-0">
            <Link href={`/admin/productos/${currentProduct.id}`} className="block max-w-[28rem] text-[14px] font-semibold leading-6 text-text-primary transition-colors hover:underline">
              {currentProduct.title}
            </Link>
            <p className="mt-1 text-xs text-text-secondary">/{currentProduct.slug}</p>
            {currentProduct.shortDescription ? (
              <p className="mt-2 line-clamp-2 max-w-[30rem] text-xs leading-5 text-text-secondary">{currentProduct.shortDescription}</p>
            ) : null}
          </div>
        </div>
      </td>

      <td className="px-4 py-4 align-top">
        <p className="font-medium text-text-primary">{currentProduct.categoryLabel}</p>
        <p className="mt-1 text-xs text-text-secondary">{currentProduct.subcategoryLabel || "Sin subcategoría"}</p>
      </td>

      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-text-primary">{currentProduct.priceLabel}</p>
        {currentProduct.priceHint ? <p className="mt-1 text-xs text-text-secondary">{currentProduct.priceHint}</p> : null}
      </td>

      <td className="px-4 py-4 align-top">
        <div
          className={cn(
            "inline-flex w-full min-w-[10.75rem] max-w-[12rem] flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium",
            getStockToneClasses(currentProduct.stockTone),
          )}
        >
          <span className="whitespace-nowrap text-[0.95rem] leading-5">{currentProduct.stockLabel}</span>
          {currentProduct.stockHint ? <span className="text-[11px] font-normal leading-4 opacity-75">{currentProduct.stockHint}</span> : null}
        </div>
      </td>

      <td className="px-4 py-4 align-middle">
        <div className="flex flex-wrap justify-center gap-1.5">
          <span className={cn("inline-flex items-center justify-center rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", visibilityBadgeClasses(currentProduct.visible))}>
            {currentProduct.visible ? "Visible" : "Oculto"}
          </span>

          {currentProduct.isOnOffer ? (
            <span className="inline-flex items-center rounded-md border border-warning/25 bg-warning-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
              En oferta
            </span>
          ) : null}

          {currentProduct.showInNewIn ? (
            <span className="inline-flex items-center rounded-md border border-info/25 bg-info-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-info">
              Lo nuevo
            </span>
          ) : null}
        </div>
      </td>

      <td className="px-4 py-4 align-top">
        <p className="font-medium text-text-primary">{currentProduct.variantLabel}</p>
        <p className="mt-1 text-xs text-text-secondary">
          {currentProduct.hasVariants
            ? currentProduct.variantSource === "colorVariants"
              ? "Modelo legacy normalizado"
              : "Variantes activas"
            : "Modelo simple"}
        </p>
      </td>

      <td className="px-4 py-4 align-top">
        <p className="max-w-[9rem] whitespace-normal font-medium leading-5 text-text-primary">{formatDashboardDateTime(new Date(currentProduct.updatedAt))}</p>
        {typeof currentProduct.newInOrder === "number" ? (
          <p className="mt-1 text-xs text-text-secondary">Prioridad Lo nuevo: {currentProduct.newInOrder}</p>
        ) : null}
      </td>

      <td className="px-4 py-4 align-middle">
        <div className="flex min-w-[11rem] flex-col gap-2">
          <Link href={`/admin/productos/${currentProduct.id}`} className={cn("h-9 w-full px-4 text-xs font-semibold", openButtonClass)}>
            <EyeIcon />
            Abrir
          </Link>
          <AdminProductQuickEditDialog product={currentProduct} onProductUpdated={(updatedProduct) => setCurrentProduct(updatedProduct)} />
        </div>
      </td>
    </tr>
  );
}
