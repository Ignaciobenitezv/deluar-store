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
        <header className="border-b border-border pb-4 lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:px-4 lg:py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-[1.25rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.5rem]">
                Envíos y etiquetas
              </h1>
              <p className="mt-1.5 max-w-2xl text-[12.5px] leading-5 text-text-secondary">
                Elegí pedidos y el transportista al generar archivos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:self-start">
              <Link href="/admin/orders" className={cn("inline-flex h-9 items-center justify-center rounded-xl border px-3.5 text-[12.5px] font-semibold", dashboardUi.softAction)}>
                Ir a órdenes
              </Link>
            </div>
          </div>
        </header>

        <section className="border-b border-border py-4 lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:px-4 lg:py-4">
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
                      "rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold transition-colors duration-150",
                      active ? "border-primary bg-primary text-primary-foreground" : dashboardUi.softAction,
                    )}
                  >
                    {option.label} <span className={active ? "ml-1 opacity-80" : "ml-1 opacity-70"}>({count})</span>
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
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                className={cn("inline-flex h-11 items-center justify-center rounded-xl border px-4 text-[12.5px] font-semibold whitespace-nowrap", dashboardUi.primaryAction)}
              >
                Buscar
              </button>
            </form>
          </div>
        </section>

        <section className="border-b border-border py-4 lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:px-4 lg:py-4">
          <p className={dashboardUi.mutedLabel}>Estado</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
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
