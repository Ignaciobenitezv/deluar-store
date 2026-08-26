"use client";

import { cn } from "@/lib/utils";

type AdminLogoutButtonProps = {
  className?: string;
  label?: string;
};

export function AdminLogoutButton({ className, label = "Cerrar sesión" }: AdminLogoutButtonProps) {
  return (
    <form action="/api/admin/logout" method="post" className={cn("shrink-0", className)}>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
      >
        {label}
      </button>
    </form>
  );
}
