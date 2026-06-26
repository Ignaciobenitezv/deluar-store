import type { Metadata } from "next";
import { hasAdminSession } from "@/features/admin/auth";
import { loginAdminAction } from "@/app/admin/login/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Login",
};

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  if (await hasAdminSession()) {
    redirect("/admin/orders");
  }

  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-xl font-semibold">Admin</h1>
      <form className="mt-6 space-y-3" action={loginAdminAction}>
        <label className="block text-sm font-medium" htmlFor="password">
          Password
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
            Password incorrecto.
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded bg-foreground px-3 py-2 text-sm font-semibold text-background"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
