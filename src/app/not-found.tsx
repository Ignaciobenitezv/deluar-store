import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";

export default function NotFound() {
  return (
    <SiteContainer className="py-16 sm:py-20">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-border/80 bg-surface px-6 py-8 shadow-[0_20px_50px_rgba(58,40,26,0.06)] sm:px-8 sm:py-10">
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
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-95"
          >
            Ir al inicio
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
