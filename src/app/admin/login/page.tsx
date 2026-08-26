import type { Metadata } from "next";
import { hasBetterAuthAdminSession } from "@/features/admin/better-auth";
import { loginAdminAction } from "@/app/admin/login/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inicio de sesión de administración",
};

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  if (await hasBetterAuthAdminSession()) {
    redirect("/admin");
  }

  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-xl font-semibold">Administración</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Ingresá con tu correo y contraseña de Better Auth.
      </p>

      <form className="mt-6 space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm" action={loginAdminAction}>
        <label className="block text-sm font-medium" htmlFor="email">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="w-full rounded border border-border px-3 py-2"
          autoComplete="username"
        />

        <label className="block text-sm font-medium" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="w-full rounded border border-border px-3 py-2"
          autoComplete="current-password"
        />

        {error ? (
          <p className="text-sm text-[var(--color-accent-strong)]">
            No pudimos iniciar sesión con esas credenciales.
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded bg-foreground px-3 py-2 text-sm font-semibold text-background"
        >
          Iniciar sesión
        </button>
      </form>
    </main>
  );
}
