"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductQuickEditAction } from "../actions/update-product-quick-edit-action";
import { AdminProductDeleteDialog } from "./admin-product-delete-dialog";
import { IconClose } from "@/features/admin/shell/admin-nav-icons";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import type {
  AdminProductListItem,
  AdminProductQuickEditActionState,
  AdminProductStockEditItem,
} from "../types";

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

function normalizeStockValue(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

type AdminProductQuickEditDialogProps = {
  product: AdminProductListItem;
  onProductUpdated?: (product: AdminProductListItem) => void;
  triggerLabel?: string;
  compactTrigger?: boolean;
};

type AdminProductQuickEditFormProps = {
  product: AdminProductListItem;
  onClose: () => void;
  onProductUpdated?: (product: AdminProductListItem) => void;
};

type StockDraft = AdminProductStockEditItem & { stock: number };

function buildInitialStockDrafts(product: AdminProductListItem) {
  return product.stockItems.map((item) => ({
    ...item,
    stock: normalizeStockValue(item.stock),
  }));
}

function AdminProductQuickEditForm({ product, onClose, onProductUpdated }: AdminProductQuickEditFormProps) {
  const router = useRouter();
  const [showInNewIn, setShowInNewIn] = useState(product.showInNewIn);
  const [stockDrafts, setStockDrafts] = useState<StockDraft[]>(() => buildInitialStockDrafts(product));
  const [state, formAction, pending] = useActionState(updateProductQuickEditAction, INITIAL_STATE);
  const successProduct = state.status === "success" ? state.product : null;

  useEffect(() => {
    if (!successProduct) {
      return;
    }

    onProductUpdated?.(successProduct);
    onClose();
  }, [onClose, onProductUpdated, successProduct]);

  const stockValuesJson = useMemo(
    () =>
      JSON.stringify(
        stockDrafts.map((item) => ({
          key: item.key,
          kind: item.kind,
          stock: item.stock,
        })),
      ),
    [stockDrafts],
  );

  const updateStockDraft = (key: string, value: string) => {
    const nextStock = normalizeStockValue(Number(value));

    setStockDrafts((current) =>
      current.map((item) => (item.key === key ? { ...item, stock: nextStock } : item)),
    );
  };

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="rev" value={product.rev} />
      <input type="hidden" name="stockValuesJson" value={stockValuesJson} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] [@supports(-webkit-overflow-scrolling:touch)]:[-webkit-overflow-scrolling:touch]">
        <div className="space-y-4">
          {state.status !== "idle" ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                state.status === "success"
                  ? "border-[var(--admin-success)]/25 bg-[var(--admin-success)]/10 text-[color:var(--admin-success)]"
                  : state.status === "conflict"
                    ? "border-[var(--admin-warning)]/25 bg-[var(--admin-warning)]/10 text-[color:var(--admin-warning)]"
                    : "border-[var(--admin-danger)]/25 bg-[var(--admin-danger)]/10 text-[color:var(--admin-danger)]",
              )}
            >
              {state.message}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-text-secondary">
              <span>Visible / Oculto</span>
              <select
                name="isActive"
                defaultValue={product.visible ? "true" : "false"}
                className="rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition focus:border-primary/50"
              >
                <option value="true">Visible</option>
                <option value="false">Oculto</option>
              </select>
              {getFieldError(state, "isActive") ? (
                <span className="text-xs font-normal text-[color:var(--admin-danger)]">{getFieldError(state, "isActive")}</span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-medium text-text-secondary">
              <span>En oferta</span>
              <select
                name="isOnOffer"
                defaultValue={product.isOnOffer ? "true" : "false"}
                className="rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition focus:border-primary/50"
              >
                <option value="true">En oferta</option>
                <option value="false">Sin oferta</option>
              </select>
              {getFieldError(state, "isOnOffer") ? (
                <span className="text-xs font-normal text-[color:var(--admin-danger)]">{getFieldError(state, "isOnOffer")}</span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-medium text-text-secondary">
              <span>Lo nuevo</span>
              <select
                name="showInNewIn"
                value={showInNewIn ? "true" : "false"}
                onChange={(event) => setShowInNewIn(event.target.value === "true")}
                className="rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition focus:border-primary/50"
              >
                <option value="true">Lo nuevo</option>
                <option value="false">Fuera de Lo nuevo</option>
              </select>
              {getFieldError(state, "showInNewIn") ? (
                <span className="text-xs font-normal text-[color:var(--admin-danger)]">{getFieldError(state, "showInNewIn")}</span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-medium text-text-secondary">
              <span>Prioridad en Lo nuevo</span>
              <input
                type="number"
                name="newInOrder"
                min={0}
                step={1}
                defaultValue={product.newInOrder ?? ""}
                disabled={!showInNewIn}
                placeholder="Ej. 1"
                className="rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary focus:border-primary/50 disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-text-secondary"
              />
              {showInNewIn ? (
                <span className="text-xs font-normal text-text-secondary">Mantiene la prioridad actual si no cambias este valor.</span>
              ) : (
                <span className="text-xs font-normal text-text-secondary">Solo se usa cuando el producto esta en Lo nuevo.</span>
              )}
              {getFieldError(state, "newInOrder") ? (
                <span className="text-xs font-normal text-[color:var(--admin-danger)]">{getFieldError(state, "newInOrder")}</span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">Stock</p>
              <p className="mt-1 text-xs text-text-secondary">
                Edita el stock base y el de cada variante desde este modal.
              </p>
            </div>

            <div className="space-y-3">
              {stockDrafts.map((item) => (
                <label
                  key={item.key}
                  className="grid gap-2 rounded-2xl border border-border bg-surface px-3 py-3 text-sm font-medium text-text-primary"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{item.label}</span>
                    {item.kind === "base" ? (
                      <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                        Base
                      </span>
                    ) : null}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={item.stock}
                    onChange={(event) => updateStockDraft(item.key, event.target.value)}
                    placeholder="Ej. 24"
                    className="rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary focus:border-primary/50"
                  />
                </label>
              ))}
            </div>

            {getFieldError(state, "stock") ? <span className="text-xs font-normal text-[color:var(--admin-danger)]">{getFieldError(state, "stock")}</span> : null}
          </div>

          {/* Same danger-zone recipe as Editar producto's delete section
              (subtle destructive border, not a saturated red card) — reuses
              AdminProductDeleteDialog as-is, so the confirmation modal,
              conflict/error handling and double-click guard are identical. */}
          <div className="rounded-2xl border border-[var(--admin-danger)]/20 bg-[var(--admin-danger)]/5 px-4 py-4 shadow-[0_0_14px_-6px_var(--admin-danger)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">Eliminar producto</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Elimina definitivamente este producto y lo quita de la tienda.
                </p>
              </div>

              <AdminProductDeleteDialog
                productId={product.id}
                productTitle={product.title}
                rev={product.rev}
                triggerClassName="w-full shrink-0 sm:w-auto"
                onDeleted={() => {
                  // Already on /admin/productos — close this panel and
                  // refresh the Server Component list in place instead of
                  // navigating there again.
                  onClose();
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-surface pt-4">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-elevated"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={pending}
            className={cn(
              "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-elevated disabled:text-text-secondary",
              dashboardUi.primaryAction,
            )}
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function AdminProductQuickEditDialog({
  product,
  onProductUpdated,
  triggerLabel = "Editar rapido",
  compactTrigger = false,
}: AdminProductQuickEditDialogProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const scrollLockYRef = useRef(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scrollLockYRef.current = window.scrollY;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousDocumentOverscrollBehavior = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollLockYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
      window.scrollTo(0, scrollLockYRef.current);
      previousActiveElementRef.current?.focus();
      previousActiveElementRef.current = null;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition",
          // Mobile-only (compactTrigger): same red outline/neon recipe as
          // AdminProductDeleteDialog's trigger — border/bg/text all driven by
          // the same `var(--admin-danger)` token, plus the same glow shadow
          // used on the delete danger-zone card — so this reuses the admin's
          // one existing "red neon" treatment instead of a second variant.
          // Desktop (the `else` branch) is untouched: same literal classes
          // as before this change.
          compactTrigger
            ? "w-auto rounded-lg border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/5 px-3.5 py-2 text-[11px] text-[color:var(--admin-danger)] shadow-[0_0_14px_-6px_var(--admin-danger)] hover:border-[var(--admin-danger)]/45 hover:bg-[var(--admin-danger)]/10 hover:shadow-[0_0_18px_-5px_var(--admin-danger)] active:scale-[0.98] active:bg-[var(--admin-danger)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-danger)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            : "w-full rounded-full border border-[#d8cdbc] bg-[#faf7f1] px-4 py-2.5 text-xs text-slate-800 hover:border-[#c8b9a4] hover:bg-[#f4ede3]",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.75 3.75a1.77 1.77 0 0 1 2.5 0l.25.25a1.77 1.77 0 0 1 0 2.5l-8.8 8.8-3.65 1 1-3.65 8.7-8.9Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 5 15 7.5" />
        </svg>
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#243247]/40 p-3 sm:flex sm:items-center sm:justify-center sm:p-6">
          <div className={cn(dashboardUi.card, "flex h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:h-auto sm:max-h-[calc(100dvh-3rem)]")}>
            <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={dashboardUi.mutedLabel}>Edicion rapida</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-text-primary">{product.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">/{product.slug}</p>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary"
                >
                  <IconClose className="h-3.5 w-3.5" />
                  Cerrar
                </button>
              </div>
            </div>

            <AdminProductQuickEditForm
              product={product}
              onClose={() => setOpen(false)}
              onProductUpdated={onProductUpdated}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
