import { Input } from "@/components/admin/ui/input";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import type { AdminBusinessProfile } from "../server/settings-data";

const disabledButtonClass = cn(
  dashboardUi.softAction,
  "inline-flex h-8 items-center justify-center rounded-xl px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-60",
);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className={dashboardUi.mutedLabel}>{children}</span>;
}

/**
 * General tab: Datos del negocio + Domicilio, 2 balanced columns on desktop,
 * 1 on mobile. Nombre comercial / Email / WhatsApp are pre-filled from the
 * real Sanity siteSettings document (see settings-data.ts) — everything
 * else (Razón social, CUIT, the whole Domicilio card) has no real source
 * anywhere in the project yet, so those fields render disabled with a
 * placeholder instead of pretending to hold or save real data.
 */
export function GeneralSection({ business }: { business: AdminBusinessProfile }) {
  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
      <section className={dashboardUi.card}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Datos del negocio</h2>
            <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">Información principal de Deluar.</p>
          </div>
        </div>

        <div className={dashboardUi.cardBody}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <FieldLabel>Nombre comercial</FieldLabel>
              <Input name="businessName" defaultValue={business.name} placeholder="Nombre comercial" />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>Razón social</FieldLabel>
              <Input name="legalName" placeholder="Aún no configurado" disabled />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>CUIT</FieldLabel>
              <Input name="cuit" placeholder="Aún no configurado" disabled />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>Email de contacto</FieldLabel>
              <Input name="contactEmail" type="email" defaultValue={business.contactEmail} placeholder="contacto@deluar.com" />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>WhatsApp</FieldLabel>
              <Input name="whatsapp" defaultValue={business.whatsapp} placeholder="+54 ..." />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
            <p className="text-[11px] leading-4 text-text-secondary">
              Vista previa visual — todavía no guarda cambios.
            </p>
            <button type="button" disabled className={disabledButtonClass}>
              Guardar cambios
            </button>
          </div>
        </div>
      </section>

      <section className={dashboardUi.card}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Domicilio</h2>
            <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">Datos de ubicación del negocio.</p>
          </div>
        </div>

        <div className={dashboardUi.cardBody}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <FieldLabel>Provincia</FieldLabel>
              <Input name="province" placeholder="Aún no configurado" disabled />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>Localidad</FieldLabel>
              <Input name="city" placeholder="Aún no configurado" disabled />
            </label>

            <label className="grid gap-1.5 sm:col-span-2">
              <FieldLabel>Dirección</FieldLabel>
              <Input name="address" placeholder="Aún no configurado" disabled />
            </label>

            <label className="grid gap-1.5">
              <FieldLabel>Código postal</FieldLabel>
              <Input name="postalCode" placeholder="Aún no configurado" disabled />
            </label>
          </div>

          <div className="mt-4 border-t border-border pt-3.5">
            <p className="text-[11px] leading-4 text-text-secondary">
              Todavía no existe una fuente real para estos datos — se habilita cuando se implemente la persistencia.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
