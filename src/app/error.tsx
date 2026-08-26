"use client";

import Link from "next/link";
import { useEffect } from "react";

type AppErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function Error({ error, unstable_retry }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[70vh] bg-background px-5 py-16 text-foreground sm:px-8">
      <section className="mx-auto flex max-w-2xl flex-col gap-8 rounded-[2rem] border border-border/80 bg-surface px-6 py-8 shadow-[0_20px_50px_rgba(58,40,26,0.06)] sm:px-8 sm:py-10">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Error inesperado</p>
          <h1 className="text-3xl font-semibold tracking-[0.02em] sm:text-4xl">
            Ocurrió un problema
          </h1>
          <p className="text-sm leading-7 text-muted sm:text-base">
            No pudimos mostrar esta sección en este momento. Probá reintentar o
            volver al inicio.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
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
  );
}
