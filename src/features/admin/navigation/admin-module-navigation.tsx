"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { AdminLogoutButton } from "@/features/admin/components/admin-logout-button";
import { cn } from "@/lib/utils";

export type AdminModuleNavItem = {
  id: string;
  label: string;
  href: string;
  description: string;
};

export type AdminModuleNavSection = {
  label: string;
  items: AdminModuleNavItem[];
};

type AdminModuleNavigationProps = {
  moduleLabel: string;
  moduleTitle: string;
  moduleDescription: string;
  homeHref: string;
  homeLabel: string;
  sections: AdminModuleNavSection[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminModuleSidebar({
  moduleLabel,
  moduleTitle,
  moduleDescription,
  homeHref,
  homeLabel,
  sections,
}: AdminModuleNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={`${moduleTitle.toLowerCase()} navigation`} className="hidden h-full bg-white lg:block">
      <div className="border-b border-slate-200/70 px-5 py-5">
        <p className={dashboardUi.mutedLabel}>{moduleLabel}</p>
        <Link
          href={homeHref}
          className="mt-3 flex items-start gap-3 rounded-[18px] border border-slate-200/70 bg-[#f8fafc] px-4 py-3 transition hover:bg-slate-50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#314158] text-sm font-semibold text-white">
            DC
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.22em] text-slate-500">{homeLabel}</span>
            <span className="block text-sm font-semibold tracking-[-0.02em] text-slate-900">{moduleTitle}</span>
          </span>
        </Link>
        <p className="mt-3 text-xs leading-5 text-slate-500">{moduleDescription}</p>
        <div className="mt-4">
          <AdminLogoutButton />
        </div>
      </div>

      <div className="space-y-5 px-3 py-4 lg:px-4">
        {sections.map((section) => (
          <section key={section.label} className="space-y-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{section.label}</p>

            <div className="space-y-1">
              {section.items.map((item) => {
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
                    <span className={cn("mt-1 block text-xs leading-5", active ? "text-slate-600" : "text-slate-500")}>
                      {item.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}

export function AdminModuleMobileMenu({
  moduleLabel,
  moduleTitle,
  moduleDescription,
  homeHref,
  homeLabel,
  sections,
}: AdminModuleNavigationProps) {
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

  return (
    <>
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_16px_32px_rgba(15,23,42,0.14)] lg:hidden"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls="admin-module-mobile-menu"
      >
        Menú
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#243247]/30"
            aria-label="Cerrar menú"
            onClick={() => setIsOpen(false)}
          />

          <div
            id="admin-module-mobile-menu"
            className="absolute inset-x-3 bottom-3 top-[12vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_48px_rgba(15,23,42,0.18)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-4 py-4">
              <div className="min-w-0">
                <p className={dashboardUi.mutedLabel}>{moduleLabel}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">{moduleTitle}</p>
                <Link href={homeHref} className="mt-2 block text-sm font-semibold tracking-[-0.02em] text-slate-900">
                  {homeLabel}
                </Link>
                <p className="mt-1 text-xs leading-5 text-slate-500">{moduleDescription}</p>
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
                {sections.map((section) => (
                  <section key={section.label} className="space-y-2">
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {section.label}
                    </p>

                    <div className="space-y-2">
                      {section.items.map((item) => {
                        const active = isActivePath(pathname, item.href);

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "block rounded-[18px] border px-3 py-3 transition",
                              active
                                ? dashboardUi.softAction
                                : "border-slate-200/70 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                            )}
                            onClick={() => setIsOpen(false)}
                          >
                            <span className="block text-sm font-medium">{item.label}</span>
                            <span className={cn("mt-1 block text-xs leading-5", active ? "text-slate-600" : "text-slate-500")}>
                              {item.description}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
