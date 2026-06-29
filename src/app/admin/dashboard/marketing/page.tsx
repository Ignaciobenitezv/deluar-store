import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { LockedMetricCard } from "@/features/admin/dashboard/components/locked-metric-card";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import { formatDashboardDateTime } from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketing | DOTCOM Commerce Dashboard",
};

type AdminDashboardMarketingPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardMarketingPage({
  searchParams,
}: AdminDashboardMarketingPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const upcomingItems = [
    "Visitas",
    "Visitantes únicos",
    "Vistas de producto",
    "Vistas de categoría",
    "Carritos creados",
    "UTM source",
    "UTM medium",
    "UTM campaign",
    "Dispositivos",
    "Abandono de checkout",
    "Fuentes de tráfico",
  ];

  return (
    <DashboardShell
      title="Marketing"
      subtitle={`Módulo futuro de analytics y adquisición. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Tracking"
          value="Próxima etapa"
          description="Pendiente de eventos de navegación y sesión."
          tone="accent"
        />
        <KpiCard
          title="UTM"
          value="Pendiente"
          description="Source, medium y campaign no persistidos."
          tone="warning"
        />
        <KpiCard
          title="Dispositivos"
          value="Pendiente"
          description="Requiere tracking de visitas."
          tone="neutral"
        />
        <KpiCard
          title="Abandono"
          value="Sin datos"
          description="No existe tracking avanzado todavía."
          tone="success"
        />
      </section>

      <ChartCard
        title="Analytics futuros"
        description="Este módulo quedará disponible cuando exista tracking avanzado."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {upcomingItems.map((item) => (
            <LockedMetricCard
              key={item}
              title={item}
              description="Disponible al activar tracking avanzado."
            />
          ))}
        </div>
      </ChartCard>
    </DashboardShell>
  );
}

