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
      <div className="mx-auto w-full max-w-[1800px] px-3 pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-4 sm:pb-6 lg:px-6 lg:py-6">
        <div className="overflow-visible lg:rounded-[30px] lg:border lg:border-slate-200/50 lg:bg-white lg:shadow-[0_12px_28px_rgba(15,23,42,0.035)]">
          <div className="min-w-0 bg-[#f6f7fb] lg:bg-transparent">
            <div className="px-0 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
              <div className={dashboardUi.shellInner}>
                <header className="rounded-[24px] border border-slate-200/70 bg-white px-3 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:rounded-[28px] sm:px-5 sm:py-5 lg:px-6">
                  <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 max-w-3xl">
                      <p className={`${dashboardUi.mutedLabel} hidden sm:block`}>Administrador de catálogo</p>

                      <div className="hidden flex-wrap gap-2 sm:mt-2 sm:flex">
                        <span className={dashboardUi.pill}>Solo lectura</span>
                        <span className={dashboardUi.pill}>Catálogo operativo</span>
                      </div>

                      <h1 className="mt-0 text-[1.55rem] font-semibold tracking-[-0.05em] text-slate-950 sm:mt-4 sm:text-[2.35rem]">
                        Productos
                      </h1>

                      <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500 sm:mt-2 sm:text-base sm:leading-7">
                        Listado operativo del catálogo.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      {resolvedUpdatedAt ? (
                        updatedAt ? (
                          <div className="hidden sm:block">
                            <AdminProductDetailUpdatedAt initialUpdatedAt={resolvedUpdatedAt} variant="badge" />
                          </div>
                        ) : (
                          <div className="hidden sm:block">
                            <AdminProductUpdatedAt initialUpdatedAt={resolvedUpdatedAt} variant="badge" />
                          </div>
                        )
                      ) : null}

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <Link
                          href="/admin"
                          className={cn(
                            "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:py-2 sm:text-sm",
                          )}
                        >
                          Volver al panel
                        </Link>
                        <Link
                          href="/admin/dashboard/productos"
                          className={cn(
                            "inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm",
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
