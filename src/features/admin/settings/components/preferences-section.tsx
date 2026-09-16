import { Badge } from "@/components/admin/ui/badge";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { AppearanceThemeSelector } from "./appearance-theme-selector";
import { NotificationTogglePreview } from "./notification-toggle-preview";

const notificationPreferences = [
  { id: "low-stock", title: "Stock bajo", description: "Avisos sobre productos con stock crítico." },
  { id: "sales", title: "Ventas", description: "Avisos cuando se registra una venta." },
];

/**
 * Apariencia uses AppearanceThemeSelector — a Configuración-only, large
 * segmented Claro/Oscuro control that reads/writes the same dataset
 * attribute + localStorage mechanism as the topbar's ThemeToggle (that
 * component itself is untouched — this is a separate, standalone Client
 * Component, not a shared-primitive edit). Notificaciones are visual-only:
 * the toggles are inert (always unchecked, no-op handler, disabled) and
 * labeled "Próximamente" so they never imply a preference is actually being
 * saved. This stays a Server Component — the toggle's event handler lives
 * in NotificationTogglePreview, a small Client Component, since a Server
 * Component can't pass a function prop across the boundary to `Switch`.
 */
export function PreferencesSection() {
  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
      <section className={dashboardUi.card}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Apariencia</h2>
            <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">Tema visual del panel de administración.</p>
          </div>
        </div>

        <div className={dashboardUi.cardBody}>
          <div className="space-y-2.5">
            <AppearanceThemeSelector />
            <p className="text-[11px] leading-4 text-text-secondary">Se aplica al instante y se recuerda en este navegador.</p>
          </div>
        </div>
      </section>

      <section className={dashboardUi.card}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Notificaciones</h2>
            <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">Avisos del panel de administración.</p>
          </div>
        </div>

        <div className={dashboardUi.cardBody}>
          <div className="space-y-2.5">
            {notificationPreferences.map((pref) => (
              <div
                key={pref.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-3.5 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] font-medium text-text-primary">{pref.title}</p>
                    <Badge>Próximamente</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-text-secondary">{pref.description}</p>
                </div>
                <NotificationTogglePreview label={pref.title} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
