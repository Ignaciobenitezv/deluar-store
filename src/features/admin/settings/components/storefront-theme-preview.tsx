import Image from "next/image";
import type { CSSProperties } from "react";
import { archivo } from "@/features/home/fonts";
import { THEME_CSS_VARIABLES } from "@/features/theme/css";
import type { ThemeTokenName, ThemeTokens } from "@/features/theme/types";
import { cn } from "@/lib/utils";

/**
 * The palette scoped to this subtree only: custom properties set inline here
 * cascade to the preview's children and nowhere else, so the storefront
 * utilities below (bg-canvas, text-ink, bg-cta…) paint the draft while the
 * real storefront theme (:root, <style data-storefront-theme>) and the admin
 * tokens (.admin-root) are untouched. The legacy aliases are re-declared
 * because globals.css resolves them at :root (and .admin-root redefines
 * --background/--surface/--border), so they would not follow otherwise.
 */
function previewStyle(tokens: ThemeTokens): CSSProperties {
  const variables: Record<string, string> = {};

  for (const [name, variable] of Object.entries(THEME_CSS_VARIABLES) as [ThemeTokenName, string][]) {
    variables[variable] = tokens[name];
  }

  variables["--background"] = tokens.canvas;
  variables["--foreground"] = tokens.ink;
  variables["--muted"] = tokens.inkMuted;
  variables["--border"] = tokens.line;
  variables["--color-accent-strong"] = tokens.cta;

  return variables as CSSProperties;
}

const NAV_ITEMS = ["Inicio", "Productos", "Contacto", "Cómo comprar"];

/**
 * A faithful miniature of the storefront surfaces each colour drives — not the
 * real components, which need cart, catalogue and navigation data. Same
 * token utilities as the store, so a colour lands where it will land there.
 * Inert: aria-hidden, no links or handlers.
 */
export function StorefrontThemePreview({ tokens, className }: { tokens: ThemeTokens; className?: string }) {
  return (
    <div
      aria-hidden="true"
      style={previewStyle(tokens)}
      className={cn("pointer-events-none select-none overflow-hidden rounded-xl border border-line bg-canvas text-ink", className)}
    >
      {/* Header and navigation */}
      <div className="border-b border-line bg-surface-raised">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="hidden h-7 w-28 items-center rounded-full border border-line/80 bg-canvas/50 px-3 text-[10px] text-ink-muted sm:flex">
            Buscar
          </span>
          <Image src="/deluarlogo.png" alt="" width={1200} height={600} className="h-8 w-auto" />
          <span className="flex h-7 items-center rounded-full border border-line px-3 text-[10px] text-ink-muted">(2)</span>
        </div>
        <nav className="flex justify-center gap-4 border-t border-line/50 px-3 text-[11px] sm:gap-6">
          {NAV_ITEMS.map((item, index) => (
            <span
              key={item}
              className={cn(
                "py-2 text-ink",
                index === 1 && "font-medium shadow-[inset_0_-2px_0_var(--brand)]",
              )}
            >
              {item}
            </span>
          ))}
        </nav>
      </div>
      <div className="bg-brand px-3 py-1.5 text-center text-[8.5px] font-semibold uppercase tracking-[0.2em] text-brand-foreground">
        Envíos a todo el país
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)] sm:p-5">
        {/* Headings, secondary text, primary button, promo price */}
        <div className="min-w-0 space-y-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-muted">Colección otoño</p>
          <h3 className={cn(archivo.className, "text-[1.6rem] font-extrabold leading-[0.95] tracking-[-0.02em] text-ink")}>
            Jarrones en tendencia
          </h3>
          <p className="text-[12px] leading-5 text-ink-muted">
            Piezas de cerámica pensadas para ambientar livings y dormitorios.
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[12px] text-ink-muted line-through">$ 29.900</span>
            <span className="text-[1.15rem] font-semibold text-promo">$ 23.920</span>
            <span className="rounded-full bg-promo px-1.5 py-0.5 text-[9px] font-bold text-promo-foreground">20% OFF</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-9 items-center rounded-full bg-cta px-4 text-[10px] uppercase tracking-[0.2em] text-cta-foreground">
              Agregar al carrito
            </span>
            <span className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-4 text-[10px] uppercase tracking-[0.2em] text-ink">
              Ver más
            </span>
          </div>
          <p className="text-[11px] text-error">Ingresá un código postal válido.</p>
        </div>

        {/* Product card */}
        <div className="overflow-hidden rounded-[12px] border border-line/90 bg-surface-raised">
          <div className="relative aspect-[4/3] bg-canvas-alt">
            <span className="absolute left-1/2 top-1/2 h-12 w-8 -translate-x-1/2 -translate-y-1/2 rounded-t-full rounded-b-md bg-accent" />
            <span className="absolute left-2 top-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-ink">
              Nuevo
            </span>
          </div>
          <div className="space-y-1 px-3 py-2.5">
            <p className="text-[8px] uppercase tracking-[0.18em] text-ink-muted">Living</p>
            <p className="text-[11.5px] leading-4 text-ink">Jarrón Nórdico 25 cm</p>
            <p className="text-[14px] font-semibold text-ink">$ 29.900</p>
            <p className="text-[9.5px] text-ink-muted">6 cuotas sin interés</p>
          </div>
          <div className={cn(archivo.className, "bg-promo px-2 py-2 text-center text-promo-foreground")}>
            <span className="block text-[8px] font-semibold uppercase tracking-[0.2em]">Transferencia</span>
            <span className="block text-[1.15rem] font-extrabold leading-none tracking-[-0.02em]">$ 23.920</span>
          </div>
        </div>
      </div>

      {/* Brand blocks: benefits strip and footer */}
      <div className="grid grid-cols-3 text-center text-[9px] font-semibold uppercase tracking-[0.16em]">
        <span className="bg-brand-alt px-2 py-3 text-brand-alt-foreground">Envíos</span>
        <span className="bg-promo px-2 py-3 text-promo-foreground">20% OFF</span>
        <span className="bg-brand-alt px-2 py-3 text-brand-alt-foreground">Cuotas</span>
      </div>
      <div className="bg-brand-soft px-4 py-3 text-[11px] text-ink">
        <span className="font-semibold">Bloque de marca suave.</span> <span className="text-ink-muted">Fondos destacados y avisos.</span>
      </div>
      <div className="bg-ink px-4 py-3 text-[10px] text-surface">Pie de página · Deluar Deco Home</div>
    </div>
  );
}
