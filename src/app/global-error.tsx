"use client";

import Link from "next/link";
import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center px-5 py-16 sm:px-8">
          <section className="w-full max-w-2xl rounded-[2rem] border border-border/80 bg-surface px-6 py-8 shadow-[0_20px_50px_rgba(58,40,26,0.06)] sm:px-8 sm:py-10">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Error crítico</p>
              <h1 className="text-3xl font-semibold tracking-[0.02em] sm:text-4xl">
                Ocurrió un problema
              </h1>
              <p className="text-sm leading-7 text-muted sm:text-base">
                Hubo un error al cargar la aplicación. Podés intentar nuevamente o
                volver al inicio.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-95"
              >
                Reintentar
              </button>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/25"
              >
                Ir al inicio
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
