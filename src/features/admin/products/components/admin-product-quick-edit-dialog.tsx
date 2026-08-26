"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductQuickEditAction } from "../actions/update-product-quick-edit-action";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import type { AdminProductListItem, AdminProductQuickEditActionState } from "../types";

const INITIAL_STATE: AdminProductQuickEditActionState = {
  status: "idle",
};

function getFieldError(
  state: AdminProductQuickEditActionState,
  field: "productId" | "rev" | "stock" | "isActive" | "isOnOffer" | "showInNewIn" | "newInOrder",
) {
  if (!("fieldErrors" in state) || !state.fieldErrors) {
    return null;
  }

  return state.fieldErrors[field]?.[0] ?? null;
}

type AdminProductQuickEditDialogProps = {
  product: AdminProductListItem;
};

export function AdminProductQuickEditDialog({ product }: AdminProductQuickEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showInNewIn, setShowInNewIn] = useState(product.showInNewIn);
  const revInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(updateProductQuickEditAction, INITIAL_STATE);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    const revUpdateTimeout = window.setTimeout(() => {
      if (revInputRef.current) {
        revInputRef.current.value = state.rev;
      }
    }, 0);

    router.refresh();
    const closeTimeout = window.setTimeout(() => {
      setOpen(false);
    }, 700);

    return () => {
      window.clearTimeout(revUpdateTimeout);
      window.clearTimeout(closeTimeout);
    };
  }, [router, state]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowInNewIn(product.showInNewIn);
          if (revInputRef.current) {
            revInputRef.current.value = product.rev;
          }
          setOpen(true);
        }}
        className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#d8cdbc] bg-[#faf7f1] px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:border-[#c8b9a4] hover:bg-[#f4ede3]"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.75 3.75a1.77 1.77 0 0 1 2.5 0l.25.25a1.77 1.77 0 0 1 0 2.5l-8.8 8.8-3.65 1 1-3.65 8.7-8.9Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 5 15 7.5" />
        </svg>
        Editar rápido
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#243247]/40 p-3 sm:items-center sm:p-6">
          <div className={cn(dashboardUi.card, "w-full max-w-2xl overflow-hidden border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]")}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className={dashboardUi.mutedLabel}>Edicion rapida</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                  {product.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">/{product.slug}</p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <form action={formAction} className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              <input type="hidden" name="productId" value={product.id} />
              <input ref={revInputRef} type="hidden" name="rev" defaultValue={product.rev} />

              {state.status !== "idle" ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    state.status === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : state.status === "conflict"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-rose-200 bg-rose-50 text-rose-900",
                  )}
                >
                  {state.message}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Visible / Oculto</span>
                  <select
                    name="isActive"
                    defaultValue={product.visible ? "true" : "false"}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="true">Visible</option>
                    <option value="false">Oculto</option>
                  </select>
                  {getFieldError(state, "isActive") ? (
                    <span className="text-xs font-normal text-rose-600">{getFieldError(state, "isActive")}</span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>En oferta</span>
                  <select
                    name="isOnOffer"
                    defaultValue={product.isOnOffer ? "true" : "false"}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="true">En oferta</option>
                    <option value="false">Sin oferta</option>
                  </select>
                  {getFieldError(state, "isOnOffer") ? (
                    <span className="text-xs font-normal text-rose-600">{getFieldError(state, "isOnOffer")}</span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Lo nuevo</span>
                  <select
                    name="showInNewIn"
                    value={showInNewIn ? "true" : "false"}
                    onChange={(event) => setShowInNewIn(event.target.value === "true")}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="true">Lo nuevo</option>
                    <option value="false">Fuera de Lo nuevo</option>
                  </select>
                  {getFieldError(state, "showInNewIn") ? (
                    <span className="text-xs font-normal text-rose-600">{getFieldError(state, "showInNewIn")}</span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Prioridad en Lo nuevo</span>
                  <input
                    type="number"
                    name="newInOrder"
                    min={0}
                    step={1}
                    defaultValue={product.newInOrder ?? ""}
                    disabled={!showInNewIn}
                    placeholder="Ej. 1"
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  {showInNewIn ? (
                    <span className="text-xs font-normal text-slate-500">
                      Mantiene la prioridad actual si no cambiás este valor.
                    </span>
                  ) : (
                    <span className="text-xs font-normal text-slate-500">
                      Solo se usa cuando el producto está en Lo nuevo.
                    </span>
                  )}
                  {getFieldError(state, "newInOrder") ? (
                    <span className="text-xs font-normal text-rose-600">{getFieldError(state, "newInOrder")}</span>
                  ) : null}
                </label>
              </div>

              <div className="grid gap-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Stock</span>
                  {product.hasVariants ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Stock administrado por variantes.
                    </div>
                  ) : (
                    <input
                      type="number"
                      name="stock"
                      min={0}
                      step={1}
                      defaultValue={product.stockValue ?? 0}
                      placeholder="Ej. 24"
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    />
                  )}
                </label>

                {getFieldError(state, "stock") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "stock")}</span>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300",
                    dashboardUi.softAction,
                  )}
                >
                  {pending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
