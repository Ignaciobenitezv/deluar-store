import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { LockedMetricCard } from "@/features/admin/dashboard/components/locked-metric-card";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import { formatDashboardDateTime } from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reportes | DOTCOM Commerce Dashboard",
};

type AdminDashboardReportsPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardReportsPage({
  searchParams,
}: AdminDashboardReportsPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const reportItems = [
    "Exportar ventas",
    "Exportar productos",
    "Exportar clientes",
    "Exportar pagos",
    "Exportar envíos",
    "Exportar dashboard completo",
    "Reportes PDF",
    "Reportes CSV/Excel",
    "Reportes programados",
  ];

  return (
    <DashboardShell
      title="Reportes"
      subtitle={`Exportaciones y vistas analíticas futuras. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <ChartCard
        title="Exportaciones futuras"
        description="Esta sección quedará lista cuando se habiliten reportes descargables."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reportItems.map((item) => (
            <LockedMetricCard
              key={item}
              title={item}
              description="Disponible en una futura versión del dashboard."
            />
          ))}
        </div>
      </ChartCard>
    </DashboardShell>
  );
}

