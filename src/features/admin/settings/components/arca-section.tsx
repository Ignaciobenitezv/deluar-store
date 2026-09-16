import { Badge } from "@/components/admin/ui/badge";
import { Input } from "@/components/admin/ui/input";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";

const disabledButtonClass = cn(
  dashboardUi.softAction,
  "inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-60",
);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className={dashboardUi.mutedLabel}>{children}</span>;
}

/**
 * Visual-only screen for the future ARCA (facturación electrónica)
 * integration — no certificates, endpoints, credentials, or auth methods
 * invented. Datos fiscales are placeholder inputs (nothing to source them
 * from yet); Conexión ARCA is an EmptyState with a disabled CTA so it never
 * pretends the integration is one click away.
 */
export function ArcaSection() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <section className={dashboardUi.card}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">ARCA</h2>
            <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">Facturación electrónica</p>
          </div>
          <Badge tone="neutral">No configurado</Badge>
        </div>

        <div className={dashboardUi.cardBody}>
          <p className="text-[12.5px] leading-5 text-text-secondary">
            Configuración fiscal y conexión para emisión de comprobantes electrónicos.
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Datos fiscales</h2>
              <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">Información para la emisión de comprobantes.</p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <FieldLabel>CUIT</FieldLabel>
                <Input placeholder="Aún no configurado" disabled />
              </label>
              <label className="grid gap-1.5">
                <FieldLabel>Razón social</FieldLabel>
                <Input placeholder="Aún no configurado" disabled />
              </label>
              <label className="grid gap-1.5">
                <FieldLabel>Condición frente al IVA</FieldLabel>
                <Input placeholder="Aún no configurado" disabled />
              </label>
              <label className="grid gap-1.5">
                <FieldLabel>Punto de venta</FieldLabel>
                <Input placeholder="Aún no configurado" disabled />
              </label>
            </div>
          </div>
        </section>

        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Conexión ARCA</h2>
              <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">Estado de la integración fiscal.</p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <EmptyState
              title="ARCA todavía no está conectado"
              description="Cuando se implemente la integración vas a poder emitir comprobantes electrónicos directamente desde acá."
              action={
                <button type="button" disabled className={disabledButtonClass}>
                  Configurar ARCA — Próximamente
                </button>
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
