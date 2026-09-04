import Link from "next/link";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { AdminProductDetailUpdatedAt, AdminProductUpdatedAt } from "./admin-product-updated-at";

type AdminProductsShellProps = {
  children: React.ReactNode;
  lastUpdated?: string;
  updatedAt?: string;
};

export function AdminProductsShell({ children, lastUpdated, updatedAt }: AdminProductsShellProps) {
  const resolvedUpdatedAt = updatedAt ?? lastUpdated;

  return (
    <main className={`${dashboardUi.pageOuter} overflow-x-visible`}>
      <div className="mx-auto w-full max-w-[1800px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className={`${dashboardUi.shell} overflow-visible`}>
          <div className="min-w-0 bg-[#f6f7fb]">
            <div className={dashboardUi.contentPadding}>
              <div className={dashboardUi.shellInner}>
                <header className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:rounded-[28px] sm:px-5 sm:py-5 lg:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 max-w-3xl">
                      <p className={dashboardUi.mutedLabel}>Administrador de catálogo</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={dashboardUi.pill}>Solo lectura</span>
                        <span className={dashboardUi.pill}>Catálogo operativo</span>
                      </div>
                      <h1 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.05em] text-slate-950 sm:mt-4 sm:text-[2.35rem]">
                        Productos
                      </h1>
                      <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500 sm:text-base sm:leading-7">
                        Listado operativo del catálogo.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 lg:items-end">
                      {resolvedUpdatedAt ? (
                        updatedAt ? (
                          <AdminProductDetailUpdatedAt initialUpdatedAt={resolvedUpdatedAt} variant="badge" />
                        ) : (
                          <AdminProductUpdatedAt initialUpdatedAt={resolvedUpdatedAt} variant="badge" />
                        )
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href="/admin"
                          className={cn(
                            "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50",
                          )}
                        >
                          Volver al panel
                        </Link>
                        <Link
                          href="/admin/dashboard/productos"
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-semibold",
                            dashboardUi.softAction,
                          )}
                        >
                          Ver analítica
                        </Link>
                      </div>
                    </div>
                  </div>
                </header>

                <div className={dashboardUi.pageStack}>{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
