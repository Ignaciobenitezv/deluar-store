"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavigation } from "../lib/dashboard-navigation";
import { dashboardUi } from "../lib/dashboard-ui";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  if (href === "/admin/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const groupLabels: Record<string, string> = {
  principal: "Principal",
  catalog: "Catálogo",
  commerce: "Comercio",
  operations: "Operaciones",
};

export function DashboardSidebar() {
  const pathname = usePathname();

  const grouped = dashboardNavigation.reduce<Record<string, typeof dashboardNavigation>>(
    (accumulator, item) => {
      if (!accumulator[item.group]) {
        accumulator[item.group] = [];
      }
      accumulator[item.group].push(item);
      return accumulator;
    },
    { principal: [], catalog: [], commerce: [], operations: [] },
  );

  return (
    <nav aria-label="Navegación del panel" className="hidden h-full bg-white lg:block">
      <div className="border-b border-slate-200/70 px-5 py-5">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#314158] text-sm font-semibold text-white">
            DC
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.22em] text-slate-500">
              DOTCOM Commerce
            </span>
            <span className="block text-sm font-semibold tracking-[-0.02em] text-slate-900">
              Panel
            </span>
          </span>
        </Link>
      </div>

      <div className="space-y-5 px-3 py-4 lg:px-4">
        {(["principal", "catalog", "commerce", "operations"] as const).map((groupKey) => {
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
                          ? dashboardUi.softAction
                          : "border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50",
                      )}
                    >
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span
                        className={cn(
                          "mt-1 block text-xs leading-5",
                          active ? "text-slate-600" : "text-slate-500",
                        )}
                      >
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
    </nav>
  );
}
