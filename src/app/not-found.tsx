import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { StorefrontThemeStyle } from "@/features/theme/components/storefront-theme-style";
import { getStorefrontTheme } from "@/features/theme/server/get-storefront-theme";

// Renders under the root layout, outside the (store) layout, so it carries the
// storefront theme itself. (error.tsx / global-error.tsx are client
// components and keep the globals.css defaults.)
export default async function NotFound() {
  const theme = await getStorefrontTheme();

  return (
    <SiteContainer className="py-16 sm:py-20">
      <StorefrontThemeStyle tokens={theme.tokens} />
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-border/80 bg-surface px-6 py-8 shadow-[0_20px_50px_color-mix(in_srgb,var(--ink)_6%,transparent)] sm:px-8 sm:py-10">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[0.02em] text-foreground sm:text-4xl">
          No encontramos esta página
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
          La dirección que intentaste abrir no existe o ya no está disponible.
          Volvé al inicio o explorá los productos publicados.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-cta px-6 text-sm uppercase tracking-[0.22em] transition-opacity hover:opacity-95"
          >
            {/* Colour on a span: the global `a { color: inherit }` rule beats utilities on links. */}
            <span className="text-cta-foreground">Ir al inicio</span>
          </Link>
          <Link
            href="/productos"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/25"
          >
            Ver productos
          </Link>
        </div>
      </section>
    </SiteContainer>
  );
}
