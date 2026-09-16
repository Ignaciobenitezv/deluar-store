import Link from "next/link";
import { AdminProductDetailUpdatedAt, AdminProductUpdatedAt } from "./admin-product-updated-at";
import { AdminProductsModuleTabs } from "@/features/admin/shell/admin-products-module-tabs";

type AdminProductsShellProps = {
  children: React.ReactNode;
  lastUpdated?: string;
  updatedAt?: string;
  /** Rendered beside the header links — the catalog list passes the create action. */
  primaryAction?: React.ReactNode;
};

const secondaryLinkClass =
  "inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3.5 text-[12.5px] font-medium text-text-primary transition-colors duration-150 hover:bg-surface-elevated";

export function AdminProductsShell({ children, lastUpdated, updatedAt, primaryAction }: AdminProductsShellProps) {
  const resolvedUpdatedAt = updatedAt ?? lastUpdated;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1800px] px-3 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="space-y-3 sm:space-y-4">
          {/* Level 1 nav for the whole módulo (Productos | Categorías) —
              shared by the list, Crear producto, Editar producto, and
              Categorías, so it lives here once instead of on every page.
              Each page still owns its own heading (see `children`) — this
              bar used to carry a redundant fixed "Productos" title on top
              of that, which is what got removed. */}
          <AdminProductsModuleTabs />

          <div className="flex flex-wrap items-center justify-end gap-2">
            {resolvedUpdatedAt ? (
              <div className="hidden sm:block">
                {updatedAt ? (
                  <AdminProductDetailUpdatedAt initialUpdatedAt={resolvedUpdatedAt} variant="badge" />
                ) : (
                  <AdminProductUpdatedAt initialUpdatedAt={resolvedUpdatedAt} variant="badge" />
                )}
              </div>
            ) : null}

            <Link href="/admin" className={secondaryLinkClass}>
              Volver al panel
            </Link>
            <Link href="/admin/dashboard/productos" className={secondaryLinkClass}>
              Ver analítica
            </Link>
            {/* On mobile this action moves next to the page's own "Productos"
                heading instead (see productos/page.tsx) — it stayed here
                unconditionally before, wrapping onto its own line below
                these two nav links instead of reading as the module's main
                action. Desktop composition is unchanged. */}
            {primaryAction ? <div className="hidden sm:block">{primaryAction}</div> : null}
          </div>

          <div className="space-y-3 sm:space-y-4">{children}</div>
        </div>
      </div>
    </main>
  );
}
