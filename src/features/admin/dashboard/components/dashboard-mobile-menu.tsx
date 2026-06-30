"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { dashboardNavigation } from "../lib/dashboard-navigation";
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

export function DashboardMobileMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const grouped = dashboardNavigation.reduce<Record<string, typeof dashboardNavigation>>(
    (accumulator, item) => {
      if (!accumulator[item.group]) {
        accumulator[item.group] = [];
      }
      accumulator[item.group].push(item);
      return accumulator;
    },
    { principal: [], commerce: [], operations: [], future: [] },
  );

  return (
    <>
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_16px_32px_rgba(15,23,42,0.14)] lg:hidden"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls="dashboard-mobile-menu"
      >
        Menú
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/30"
            aria-label="Cerrar menú"
            onClick={() => setIsOpen(false)}
          />

          <div
            id="dashboard-mobile-menu"
            className="absolute inset-x-3 bottom-3 top-[12vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_48px_rgba(15,23,42,0.18)]"
          >
            <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  DOTCOM Commerce
                </p>
                <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-900">
                  Navegación
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                onClick={() => setIsOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="h-full overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {(["principal", "commerce", "operations", "future"] as const).map((groupKey) => {
                  const items = grouped[groupKey];

                  return (
                    <section key={groupKey} className="space-y-2">
                      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        {groupLabels[groupKey]}
                      </p>

                      <div className="space-y-2">
                        {items.map((item) => {
                          const active = isActivePath(pathname, item.href);

                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "block rounded-[18px] border px-3 py-3 transition",
                                active
                                  ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]"
                                  : "border-slate-200/70 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                              )}
                              onClick={() => setIsOpen(false)}
                            >
                              <span className="block text-sm font-medium">{item.label}</span>
                              <span
                                className={cn(
                                  "mt-1 block text-xs leading-5",
                                  active ? "text-white/75" : "text-slate-500",
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
