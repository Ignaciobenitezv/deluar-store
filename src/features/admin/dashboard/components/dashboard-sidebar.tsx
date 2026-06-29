"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavigation } from "../lib/dashboard-navigation";
import { dashboardUi } from "../lib/dashboard-ui";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const groupLabels: Record<string, string> = {
  principal: "Principal",
  commerce: "Comercio",
  operations: "Operación",
  future: "Futuro",
};

export function DashboardSidebar() {
  const pathname = usePathname();

  const grouped = dashboardNavigation.reduce<Record<string, typeof dashboardNavigation>>(
    (accumulator, item) => {
      accumulator[item.group] ??= [];
      accumulator[item.group].push(item);
      return accumulator;
    },
    { principal: [], commerce: [], operations: [], future: [] },
  );

  return (
    <nav aria-label="Navegación del dashboard" className="h-full bg-white">
      <div className="border-b border-slate-200/70 px-5 py-5">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            DC
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.22em] text-slate-500">
              DOTCOM Commerce
            </span>
            <span className="block text-sm font-semibold tracking-[-0.02em] text-slate-900">
              Dashboard
            </span>
          </span>
        </Link>
      </div>

      <div className="space-y-5 px-3 py-4 lg:px-4">
        {(["principal", "commerce", "operations", "future"] as const).map((groupKey) => {
          const items = grouped[groupKey];

          return (
            <section key={groupKey} className="space-y-2">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {groupLabels[groupKey]}
              </p>

              <div className="space-y-1">
                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-[18px] border px-3.5 py-3 transition",
                        active
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]"
                          : "border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50",
                      )}
                    >
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className={cn("mt-1 block text-xs leading-5", active ? "text-white/75" : "text-slate-500")}>
                        {item.description}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className={`border-t border-slate-200/70 px-5 py-4 ${dashboardUi.navbarSurface} lg:hidden`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Navegación
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            Mobile
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {dashboardNavigation.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

