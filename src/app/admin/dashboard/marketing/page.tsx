import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { LockedMetricCard } from "@/features/admin/dashboard/components/locked-metric-card";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
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
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());
  const missingTracking = metrics.marketing.missingTracking;

  return (
    <DashboardShell
      title="Marketing"
      subtitle={`Módulo futuro de analytics y adquisición. Requiere tracking avanzado. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Estado"
          value="Pendiente"
          description="No hay tracking avanzado activo."
          tone="accent"
        />
        <KpiCard
          title="Datos faltantes"
          value={missingTracking.length.toString()}
          description="Métricas que dependen de tracking."
          tone="warning"
        />
        <KpiCard
          title="Cobertura"
          value="Futura"
          description="Visitas, UTM y abandono."
          tone="neutral"
        />
        <KpiCard
          title="Lectura"
          value="Honesta"
          description="No se inventan métricas."
          tone="success"
        />
      </section>

      <ChartCard
        title="Tracking faltante"
        description="Estas son las métricas reales que todavía no existen en el producto."
        emptyState={
          <EmptyState
            title="No hay métricas de marketing disponibles todavía."
            description="Cuando exista tracking avanzado, este módulo mostrará visitas, UTM, dispositivos y abandono."
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {missingTracking.map((item) => (
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
