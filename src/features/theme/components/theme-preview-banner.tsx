import type { StorefrontTheme } from "@/features/theme/types";

/**
 * Shown only while an authorised admin previews the saved palette draft on
 * the real storefront (getStorefrontTheme sets `preview`). Plain form posts:
 * no client code, nothing rendered for regular visitors.
 */
export function ThemePreviewBanner({ preview }: { preview: NonNullable<StorefrontTheme["preview"]> }) {
  const message = !preview.hasDraft
    ? "No hay un borrador guardado: ves la paleta publicada."
    : preview.draftRejected
      ? "El borrador tiene valores inválidos: ves la paleta publicada."
      : "Ves el borrador de colores guardado. Solo vos lo ves.";

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-[13px] shadow-[0_18px_42px_color-mix(in_srgb,var(--ink)_34%,transparent)] sm:right-auto"
    >
      <p className="min-w-0 text-surface">
        <span className="font-semibold">Vista previa · </span>
        {message}
      </p>
      <form action="/api/admin/theme-preview" method="post">
        <input type="hidden" name="action" value="disable" />
        {/* Text colour on a span: globals.css sets an unlayered button { font: inherit }. */}
        <button type="submit" className="rounded-full bg-surface px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
          <span className="text-[12px] font-medium text-ink">Salir de la vista previa</span>
        </button>
      </form>
    </div>
  );
}
