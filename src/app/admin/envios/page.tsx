import type { Metadata } from "next";
import Link from "next/link";
import { AndreaniGeneratedBatchesPanel } from "@/features/shipments/components/andreani-generated-batches-panel";
import { AndreaniPendingExportsPanel } from "@/features/shipments/components/andreani-pending-exports-panel";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { getAndreaniExportsDashboardData } from "@/features/shipments/andreani-export/batch-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Envios y etiquetas | Panel de comercio de DOTCOM",
};

type AdminShipmentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const TAB_OPTIONS = [
  { value: "pendientes", label: "Pendientes" },
  { value: "generados", label: "Generados" },
] as const;

function normalizeTab(value: string | undefined) {
  return TAB_OPTIONS.some((option) => option.value === value) ? (value as (typeof TAB_OPTIONS)[number]["value"]) : "pendientes";
}

function buildHref(tab: string, q: string) {
  const params = new URLSearchParams();

  if (tab !== "pendientes") {
    params.set("tab", tab);
  }

  if (q.trim()) {
    params.set("q", q.trim());
  }

  const query = params.toString();
  return query ? `/admin/envios?${query}` : "/admin/envios";
}

export default async function AdminShipmentsPage({ searchParams }: AdminShipmentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const activeTab = normalizeTab(typeof resolvedSearchParams?.tab === "string" ? resolvedSearchParams.tab : undefined);
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : "";
  const pageData = await getAndreaniExportsDashboardData(q);

  return (
    <div className={dashboardUi.contentPadding}>
      <div className={dashboardUi.shellInner}>
        <header className="border-b border-slate-200/70 pb-4 lg:rounded-[24px] lg:border lg:border-slate-200/70 lg:bg-white lg:px-4 lg:py-4 lg:shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className={dashboardUi.mutedLabel}>Operación</p>
              <h1 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.05em] text-slate-950 sm:mt-3 sm:text-[2.35rem]">
                Envíos y etiquetas
              </h1>
              <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500 sm:text-base sm:leading-7">
                Elegí pedidos y el transportista al generar archivos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:self-start">
              <Link
                href="/admin/orders"
                className={cn(
                  "inline-flex items-center justify-center rounded-[10px] border px-3 py-2 text-[12px] font-semibold lg:rounded-full lg:px-4 lg:py-2.5 lg:text-sm",
                  dashboardUi.softAction,
                )}
              >
                Ir a órdenes
              </Link>
            </div>
          </div>
        </header>

        <section className="border-b border-slate-200/70 py-4 lg:rounded-[24px] lg:border lg:border-slate-200/70 lg:bg-white lg:px-4 lg:py-4 lg:shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {TAB_OPTIONS.map((option) => {
                const active = activeTab === option.value;
                const count = option.value === "pendientes" ? pageData.summary.pending : pageData.summary.generatedBatches;

                return (
                  <Link
                    key={option.value}
                    href={buildHref(option.value, q)}
                    className={cn(
                      "rounded-[10px] border px-3 py-2 text-[12px] font-semibold transition lg:rounded-full lg:px-4 lg:py-2 lg:text-sm",
                      active
                        ? "border-[#314158] bg-[#314158] !text-white shadow-[0_10px_22px_rgba(49,65,88,0.16)]"
                        : dashboardUi.softAction,
                    )}
                  >
                    {option.label} <span className={active ? "ml-1 !text-white/80" : "ml-1 opacity-70"}>({count})</span>
                  </Link>
                );
              })}
            </div>

            <form method="get" className="grid w-full grid-cols-1 gap-2 min-[390px]:grid-cols-[minmax(0,1fr)_auto] min-[390px]:items-end lg:w-auto lg:max-w-xl">
              <input type="hidden" name="tab" value={activeTab} />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Pedido, destinatario o archivo"
                className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60"
              />
              <button
                type="submit"
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-[10px] border px-4 text-[12px] font-semibold whitespace-nowrap lg:rounded-full lg:px-4 lg:py-2.5 lg:text-sm",
                  dashboardUi.primaryAction,
                )}
              >
                Buscar
              </button>
            </form>
          </div>
        </section>

        <section className="border-b border-slate-200/70 py-4 lg:rounded-[24px] lg:border lg:border-slate-200/70 lg:bg-white lg:px-4 lg:py-4 lg:shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
          <p className={dashboardUi.mutedLabel}>Estado</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Generado: el archivo fue creado. El envío todavía debe gestionarse en Andreani.
          </p>
        </section>

        {activeTab === "pendientes" ? (
          <AndreaniPendingExportsPanel shipments={pageData.pendingShipments} />
        ) : (
          <AndreaniGeneratedBatchesPanel batches={pageData.generatedBatches} />
        )}
      </div>
    </div>
  );
}
