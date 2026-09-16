"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { deleteProductAction } from "../actions/delete-product-action";

type AdminProductDeleteDialogProps = {
  productId: string;
  productTitle: string;
  rev: string;
  /** Layout-only override for the trigger button — everything else about
   * this component (state, the confirm action, the modal) is untouched by
   * whatever the caller passes here. */
  triggerClassName?: string;
  /** Called instead of the default `router.replace("/admin/productos")` on a
   * successful delete — e.g. Edición rápida uses this to close its own panel
   * and refresh the list in place instead of navigating, since it's already
   * on /admin/productos. Editar producto doesn't pass this, so its behavior
   * is unchanged. */
  onDeleted?: () => void;
};

export function AdminProductDeleteDialog({
  productId,
  productTitle,
  rev,
  triggerClassName,
  onDeleted,
}: AdminProductDeleteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const scrollLockYRef = useRef(0);

  // Same scroll-lock + focus-restore pattern as AdminProductQuickEditDialog,
  // so this dialog matches the admin's existing modal behavior instead of
  // inventing a second one.
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

  const handleOpen = () => {
    setError(null);
    setOpen(true);
  };

  const handleCancel = () => {
    if (isPending) {
      return;
    }

    setOpen(false);
    setError(null);
  };

  const handleConfirm = () => {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await deleteProductAction(productId, rev);

      if (result.status === "success") {
        if (onDeleted) {
          onDeleted();
        } else {
          router.replace("/admin/productos");
        }
        return;
      }

      setError(result.message);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/5 px-5 py-3 text-sm font-semibold text-[color:var(--admin-danger)] transition hover:bg-[var(--admin-danger)]/10",
          triggerClassName,
        )}
      >
        Eliminar producto
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#243247]/40 p-4">
          <div className={cn(dashboardUi.card, "w-full max-w-md p-5 shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:p-6")}>
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">Eliminar producto</h3>

            <p className="mt-3 text-sm text-text-primary">
              ¿Seguro que querés eliminar &quot;{productTitle}&quot;?
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              El producto se eliminará definitivamente y dejará de aparecer en la tienda. Esta acción no se puede deshacer.
            </p>

            {error ? (
              <div
                aria-live="polite"
                className="mt-4 rounded-[16px] border border-[var(--admin-danger)]/25 bg-[var(--admin-danger)]/10 px-4 py-3 text-sm text-[color:var(--admin-danger)]"
              >
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-full border border-[var(--admin-danger)] bg-[var(--admin-danger)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Eliminando..." : "Eliminar producto"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
