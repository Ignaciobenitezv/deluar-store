import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { integrationIcons } from "./integration-icons";
import type { AdminIntegrationStatus, AdminIntegrationSummary } from "../server/settings-data";

const statusCopy: Record<AdminIntegrationStatus, { label: string; tone: BadgeTone }> = {
  connected: { label: "Conectado", tone: "success" },
  pending: { label: "Pendiente", tone: "warning" },
  not_configured: { label: "No configurado", tone: "neutral" },
};

const configureButtonClass = cn(
  dashboardUi.softAction,
  "inline-flex h-8 items-center justify-center rounded-xl px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-60",
);

function IntegrationCard({ id, name, description, status }: AdminIntegrationSummary) {
  const copy = statusCopy[status];

  return (
    <div className={dashboardUi.card}>
      <div className={cn(dashboardUi.cardBody, "flex flex-col gap-3")}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
            {integrationIcons[id]}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-primary">{name}</p>
            <p className="mt-0.5 text-[11.5px] leading-4 text-text-secondary">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Badge tone={copy.tone}>{copy.label}</Badge>
          {/* No integration has a real per-service configuration screen yet,
              so this stays disabled rather than link to a flow that isn't built. */}
          <button type="button" disabled className={configureButtonClass}>
            {status === "connected" ? "Ver configuración" : "Configurar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function IntegrationsSection({ integrations }: { integrations: AdminIntegrationSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard key={integration.id} {...integration} />
      ))}
    </div>
  );
}
