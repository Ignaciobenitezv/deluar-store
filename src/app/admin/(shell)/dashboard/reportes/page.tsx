import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import { formatDashboardDateTime } from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reportes | Panel de comercio de DOTCOM",
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

  return (
    <DashboardShell
      title="Reportes"
      subtitle={`Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <ChartCard title="Reportes" description="Sin datos para este período.">
        <EmptyState title="Sin datos para este período." description="No hay reportes disponibles." />
      </ChartCard>
    </DashboardShell>
  );
}
