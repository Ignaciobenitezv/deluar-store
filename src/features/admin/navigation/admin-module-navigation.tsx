"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  userName?: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Sidebar icons by nav item ID ──────────────────────────────────────────────

const NavIconsMap: Record<string, React.ReactNode> = {
  overview: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  ),
  acquisition: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 11 5.5 6.5l2.5 2.5L12.5 4" />
      <path d="M10 4h3v3" />
    </svg>
  ),
  sales: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 13.5V7M6.5 13.5V4M10 13.5V8.5M13.5 13.5V6" />
    </svg>
  ),
  conversion: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 3.5h11l-4 5.5v3.5l-3-1V9l-4-5.5Z" />
    </svg>
  ),
  "abandoned-carts": (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 2.5H3L4.5 9h7L13 5H5" />
      <circle cx="5.5" cy="12.5" r="1" />
      <circle cx="11" cy="12.5" r="1" />
    </svg>
  ),
  "products-analytics": (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5 14.5 5v6L8 14.5 1.5 11V5L8 1.5Z" />
      <path d="M8 1.5v13M1.5 5l6.5 3.5L14.5 5" />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5" r="2.5" />
      <path d="M1 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <path d="M10.5 3.5c1 .4 1.8 1.4 1.8 2.5s-.8 2.1-1.8 2.5" />
      <path d="M14.5 13.5c0-2-1.5-3.5-3.5-3.5" />
    </svg>
  ),
  checkout: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5.5 8l2 2 3-4" />
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M1.5 6.5h13" />
      <path d="M4 9.5h2.5M9.5 9.5h2.5" />
    </svg>
  ),
  shipping: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.5h8v6.5H2z" />
      <path d="M10 7.5h2.5L14 10.5v1H10v-4Z" />
      <circle cx="4.5" cy="12.5" r="1.1" />
      <circle cx="12" cy="12.5" r="1.1" />
    </svg>
  ),
  location: (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14S3 9.5 3 6.5a5 5 0 0 1 10 0C13 9.5 8 14 8 14Z" />
      <circle cx="8" cy="6.5" r="1.8" />
    </svg>
  ),
  "products-list": (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M2 7h12M7 2v12" />
    </svg>
  ),
  "orders-list": (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="3" y="1.5" width="10" height="13" rx="1.5" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
    </svg>
  ),
  "shipments-list": (
    <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.5h8v6.5H2z" />
      <path d="M10 7.5h2.5L14 10.5v1H10v-4Z" />
      <circle cx="4.5" cy="12.5" r="1.1" />
      <circle cx="12" cy="12.5" r="1.1" />
    </svg>
  ),
};

function NavIcon({ itemId, active }: { itemId: string; active: boolean }) {
  const icon = NavIconsMap[itemId];
  return (
    <span
      className={cn(
        "flex h-[14px] w-[14px] shrink-0 items-center justify-center",
        active ? "text-[#9d7d62]" : "text-slate-400 group-hover:text-slate-600",
      )}
    >
      {icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    </span>
  );
}

// ── Brand logo mark ────────────────────────────────────────────────────────────

function DeluarMark() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#243247]">
      <svg viewBox="0 0 14 14" fill="none" className="h-[11px] w-[11px]" aria-hidden="true">
        <path d="M7 .5 13.5 4.5v5L7 13.5.5 9.5v-5L7 .5Z" fill="rgba(255,255,255,0.88)" />
        <path d="M7 .5v13M.5 4.5l6.5 4 6.5-4" stroke="rgba(255,255,255,0.22)" strokeWidth=".8" />
      </svg>
    </div>
  );
}

// ── AdminModuleSidebar ─────────────────────────────────────────────────────────

export function AdminModuleSidebar({
  moduleLabel,
  moduleTitle,
  moduleDescription,
  homeHref,
  homeLabel,
  sections,
  userName,
}: AdminModuleNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={`${moduleTitle} navigation`} className="flex h-full flex-col overflow-hidden">

      {/* Brand block */}
      <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-slate-100 px-4">
        <DeluarMark />
        <span className="text-[13px] font-semibold tracking-[-0.02em] text-slate-900">Deluar</span>
        <span className="ml-auto rounded-[5px] bg-[#f4f1ed] px-1.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9d7d62]">
          Admin
        </span>
      </div>

      {/* Module context */}
      <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-3">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {moduleLabel}
        </p>
        <Link
          href={homeHref}
          className="mt-1.5 flex items-center gap-1.5 text-[12px] text-slate-500 transition-colors hover:text-slate-900"
        >
          <svg viewBox="0 0 10 10" fill="none" className="h-2 w-2 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 1.5 3.5 5l3 3.5" />
          </svg>
          <span>{homeLabel}</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          <section key={section.label} className="mb-5">
            <p className="mb-1 px-2 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {section.label}
            </p>
            <div className="space-y-px">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex h-8 items-center gap-2.5 rounded-[7px] px-2 text-[13px] leading-none transition-colors",
                      active
                        ? "bg-[#f0ebe5] font-semibold text-slate-950"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <NavIcon itemId={item.id} active={active} />
                    <span className="min-w-0 truncate">{item.label}</span>
                    {active ? (
                      <span className="ml-auto h-[5px] w-[5px] shrink-0 rounded-full bg-[#9d7d62]" aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Footer – user + logout */}
      <div className="shrink-0 border-t border-slate-100 px-3 py-3">
        {userName ? (
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0ebe5] text-[10px] font-semibold text-[#9d7d62]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="min-w-0 truncate text-[12px] font-medium text-slate-700">{userName}</span>
          </div>
        ) : null}
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="flex h-8 w-full items-center gap-2.5 rounded-[7px] px-2 text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px] shrink-0 text-slate-400" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2.5H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10.5 11 13.5 8l-3-3M13.5 8H6" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

// ── AdminModuleMobileMenu ──────────────────────────────────────────────────────

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
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
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
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <DeluarMark />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">Deluar Admin</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-400">
                    {moduleLabel}
                  </p>
                  <Link
                    href={homeHref}
                    className="mt-1 block text-[11px] text-slate-500 transition-colors hover:text-slate-900"
                    onClick={() => setIsOpen(false)}
                  >
                    ← {homeLabel}
                  </Link>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                onClick={() => setIsOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="h-full overflow-y-auto px-4 py-4 pb-24">
              <div className="space-y-5">
                {sections.map((section) => (
                  <section key={section.label} className="space-y-0.5">
                    <p className="px-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {section.label}
                    </p>
                    <div>
                      {section.items.map((item) => {
                        const active = isActivePath(pathname, item.href);
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex h-10 items-center gap-3 rounded-[8px] px-3 text-sm transition-colors",
                              active
                                ? "bg-[#f0ebe5] font-semibold text-slate-950"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                            )}
                            onClick={() => setIsOpen(false)}
                          >
                            <NavIcon itemId={item.id} active={active} />
                            {item.label}
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
