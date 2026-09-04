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
        <header className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:rounded-[28px] sm:px-5 sm:py-5 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className={dashboardUi.mutedLabel}>Operacion</p>
              <h1 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.05em] text-slate-950 sm:mt-4 sm:text-[2.35rem]">
                Envos y etiquetas
              </h1>
              <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500 sm:text-base sm:leading-7">
                Elegí pedidos y el transportista al generar archivos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/orders"
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold",
                  dashboardUi.softAction,
                )}
              >
                Ir a ordenes
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:px-5 sm:py-5">
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
                      "rounded-full border px-4 py-2 text-sm font-semibold transition",
                      active ? dashboardUi.primaryAction : dashboardUi.softAction,
                    )}
                  >
                    {option.label} <span className="ml-1 opacity-70">({count})</span>
                  </Link>
                );
              })}
            </div>

            <form method="get" className="flex w-full max-w-xl gap-2 lg:w-auto">
              <input type="hidden" name="tab" value={activeTab} />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Pedido, destinatario o archivo"
                className="w-full rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-[#bda88d] focus:ring-2 focus:ring-[#d9c8b4]/60"
              />
              <button
                type="submit"
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold",
                  dashboardUi.primaryAction,
                )}
              >
                Buscar
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:px-5 sm:py-5">
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
