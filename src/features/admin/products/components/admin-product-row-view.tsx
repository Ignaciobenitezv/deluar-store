"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminProductQuickEditDialog } from "./admin-product-quick-edit-dialog";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
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
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "neutral":
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1.75 10s2.75-5.5 8.25-5.5S18.25 10 18.25 10s-2.75 5.5-8.25 5.5S1.75 10 1.75 10Z" />
      <circle cx="10" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminProductRowView({ product, variant }: AdminProductRowViewProps) {
  const [currentProduct, setCurrentProduct] = useState(product);

  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  if (variant === "mobile") {
    return (
      <article className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.028)]">
        <div className="flex items-start gap-3">
          <div className="relative h-[4rem] w-[3.5rem] shrink-0 overflow-hidden rounded-[18px] border border-[#e1d7ca] bg-slate-100">
            {currentProduct.imageUrl ? (
              <Image src={currentProduct.imageUrl} alt={currentProduct.imageAlt} fill sizes="56px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Sin imagen
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Link href={`/admin/productos/${currentProduct.id}`} className="block text-sm font-semibold leading-5 text-slate-900 transition hover:underline">
              {currentProduct.title}
            </Link>
            <p className="mt-1 text-xs text-slate-500">/{currentProduct.slug}</p>
            {currentProduct.shortDescription ? (
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{currentProduct.shortDescription}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Categoría</p>
            <p className="mt-1 font-medium text-slate-900">{currentProduct.categoryLabel}</p>
            <p className="mt-1 text-xs text-slate-500">{currentProduct.subcategoryLabel || "Sin subcategoría"}</p>
          </div>

          <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Precio</p>
            <p className="mt-1 font-medium text-slate-900">{currentProduct.priceLabel}</p>
            {currentProduct.priceHint ? <p className="mt-1 text-xs text-slate-500">{currentProduct.priceHint}</p> : null}
          </div>

          <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stock</p>
            <div
              className={cn(
                "mt-1 inline-flex w-full min-w-[10.75rem] max-w-[12rem] flex-col items-start gap-0.5 rounded-[16px] border px-3 py-2.5 text-left text-sm font-medium",
                getStockToneClasses(currentProduct.stockTone),
              )}
            >
              <span className="whitespace-nowrap text-[0.95rem] leading-5">{currentProduct.stockLabel}</span>
              {currentProduct.stockHint ? <span className="text-[11px] font-normal leading-4 opacity-75">{currentProduct.stockHint}</span> : null}
            </div>
          </div>

          <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Estado</p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  currentProduct.visible
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-slate-100 text-slate-600",
                )}
              >
                {currentProduct.visible ? "Visible" : "Oculto"}
              </span>

              {currentProduct.isOnOffer ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-amber-900">
                  En oferta
                </span>
              ) : null}

              {currentProduct.showInNewIn ? (
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-sky-900">
                  Lo nuevo
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Variantes</p>
            <p className="mt-1 font-medium text-slate-900">{currentProduct.variantLabel}</p>
            <p className="mt-1 text-xs text-slate-500">
              {currentProduct.hasVariants
                ? currentProduct.variantSource === "colorVariants"
                  ? "Modelo legacy normalizado"
                  : "Variantes activas"
                : "Modelo simple"}
            </p>
          </div>

          <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Actualizado</p>
            <p className="mt-1 font-medium text-slate-900">{formatDashboardDateTime(new Date(currentProduct.updatedAt))}</p>
            {typeof currentProduct.newInOrder === "number" ? (
              <p className="mt-1 text-xs text-slate-500">Prioridad Lo nuevo: {currentProduct.newInOrder}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/admin/productos/${currentProduct.id}`}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold",
              dashboardUi.softAction,
            )}
          >
            <EyeIcon />
            Abrir
          </Link>
          <div className="flex-1">
            <AdminProductQuickEditDialog
              product={currentProduct}
              onProductUpdated={(updatedProduct) => setCurrentProduct(updatedProduct)}
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <tr className="border-t border-[#ebe3d8] align-top transition hover:bg-[#fbfcfe]">
      <td className="px-5 py-6">
        <div className="flex items-start gap-4">
          <div className="relative h-[4rem] w-[3.5rem] shrink-0 overflow-hidden rounded-[18px] border border-[#e1d7ca] bg-slate-100">
            {currentProduct.imageUrl ? (
              <Image src={currentProduct.imageUrl} alt={currentProduct.imageAlt} fill sizes="56px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Sin imagen
              </div>
            )}
          </div>

          <div className="min-w-0">
            <Link href={`/admin/productos/${currentProduct.id}`} className="block max-w-[28rem] text-[15px] font-semibold leading-6 text-slate-950 transition hover:underline">
              {currentProduct.title}
            </Link>
            <p className="mt-1 text-xs text-slate-500">/{currentProduct.slug}</p>
            {currentProduct.shortDescription ? (
              <p className="mt-2 line-clamp-2 max-w-[30rem] text-xs leading-5 text-slate-500">{currentProduct.shortDescription}</p>
            ) : null}
          </div>
        </div>
      </td>

      <td className="px-5 py-6 align-top">
        <p className="font-medium text-slate-900">{currentProduct.categoryLabel}</p>
        <p className="mt-1 text-xs text-slate-500">{currentProduct.subcategoryLabel || "Sin subcategoría"}</p>
      </td>

      <td className="px-5 py-6 align-top">
        <p className="font-semibold text-slate-950">{currentProduct.priceLabel}</p>
        {currentProduct.priceHint ? <p className="mt-1 text-xs text-slate-500">{currentProduct.priceHint}</p> : null}
      </td>

      <td className="px-5 py-6 align-top">
        <div
          className={cn(
            "inline-flex w-full min-w-[10.75rem] max-w-[12rem] flex-col items-start gap-0.5 rounded-[18px] border px-3.5 py-3 text-left text-sm font-medium",
            getStockToneClasses(currentProduct.stockTone),
          )}
        >
          <span className="whitespace-nowrap text-[0.95rem] leading-5">{currentProduct.stockLabel}</span>
          {currentProduct.stockHint ? <span className="text-[11px] font-normal leading-4 opacity-75">{currentProduct.stockHint}</span> : null}
        </div>
      </td>

      <td className="px-5 py-6 align-middle">
        <div className="flex flex-wrap justify-center gap-2">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
              currentProduct.visible
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-200 bg-slate-100 text-slate-600",
            )}
          >
            {currentProduct.visible ? "Visible" : "Oculto"}
          </span>

          {currentProduct.isOnOffer ? (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">
              En oferta
            </span>
          ) : null}

          {currentProduct.showInNewIn ? (
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900">
              Lo nuevo
            </span>
          ) : null}
        </div>
      </td>

      <td className="px-5 py-6 align-top">
        <p className="font-medium text-slate-900">{currentProduct.variantLabel}</p>
        <p className="mt-1 text-xs text-slate-500">
          {currentProduct.hasVariants
            ? currentProduct.variantSource === "colorVariants"
              ? "Modelo legacy normalizado"
              : "Variantes activas"
            : "Modelo simple"}
        </p>
      </td>

      <td className="px-5 py-6 align-top">
        <p className="max-w-[9rem] whitespace-normal font-medium leading-5 text-slate-900">{formatDashboardDateTime(new Date(currentProduct.updatedAt))}</p>
        {typeof currentProduct.newInOrder === "number" ? (
          <p className="mt-1 text-xs text-slate-500">Prioridad Lo nuevo: {currentProduct.newInOrder}</p>
        ) : null}
      </td>

      <td className="px-5 py-6 align-middle">
        <div className="flex min-w-[12rem] flex-col gap-2">
          <Link
            href={`/admin/productos/${currentProduct.id}`}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-semibold",
              dashboardUi.softAction,
            )}
          >
            <EyeIcon />
            Abrir
          </Link>
          <AdminProductQuickEditDialog
            product={currentProduct}
            onProductUpdated={(updatedProduct) => setCurrentProduct(updatedProduct)}
          />
        </div>
      </td>
    </tr>
  );
}
