"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { adminNavSections, resolveActiveNavItemId } from "./admin-nav-config";
import { AdminNavIcon, IconClose, IconGear, IconLogout } from "./admin-nav-icons";

const SETTINGS_HREF = "/admin/configuracion";

// Órdenes / Envíos already live under "Módulos" on desktop, and Pagos /
// Costos de envío / Ubicación under "Operaciones" — this sheet regroups them
// under one "Operaciones" heading instead, since it's presenting "everything
// not pinned to the bottom bar," a different frame than the desktop sidebar.
// Pulled by id from adminNavSections (the single source of truth for hrefs),
// never re-typed, so a route can't drift between the sidebar and this sheet.
const OPERATIONS_IDS = ["orders-list", "shipments-list", "payments", "shipping-analytics", "location"];

function findNavItemsByIds(ids: string[]) {
  const allItems = adminNavSections.flatMap((section) => section.items);
  return ids
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

type AdminMobileMenuSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminMobileMenuSheet({ open, onClose }: AdminMobileMenuSheetProps) {
  const pathname = usePathname();
  const activeId = resolveActiveNavItemId(pathname);
  const isSettingsActive = pathname === SETTINGS_HREF || pathname.startsWith(`${SETTINGS_HREF}/`);
  const scrollLockYRef = useRef(0);
  const operationsItems = findNavItemsByIds(OPERATIONS_IDS);

  // Same body-scroll-lock recipe as AdminProductQuickEditDialog: fixed body
  // pinned at the current scroll offset (not just overflow:hidden), which
  // also holds on iOS Safari.
  useEffect(() => {
    if (!open) {
      return;
    }

    scrollLockYRef.current = window.scrollY;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousDocumentOverscrollBehavior = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollLockYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
      window.scrollTo(0, scrollLockYRef.current);
    };
  }, [open, onClose]);

  const rowClass = (active: boolean) =>
    cn(
      "flex h-12 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors duration-150",
      active ? "bg-primary font-medium text-primary-foreground" : "text-text-secondary hover:bg-surface hover:text-text-primary",
    );

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <motion.button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-surface shadow-[var(--admin-shadow-md)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
          >
            <div className="flex shrink-0 flex-col items-center pt-2.5">
              <span aria-hidden="true" className="h-1 w-9 rounded-full bg-border" />
              <div className="mt-2 flex w-full items-center justify-between px-4 pb-3">
                <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">Menú</span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar menú"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors duration-150 hover:bg-surface-elevated hover:text-text-primary"
                >
                  <IconClose className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
            >
              <section className="mb-4">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  Operaciones
                </p>
                <div className="space-y-0.5">
                  {operationsItems.map((item) => {
                    const active = item.id === activeId;
                    return (
                      <Link key={item.id} href={item.href} aria-current={active ? "page" : undefined} onClick={onClose} className={rowClass(active)}>
                        <AdminNavIcon itemId={item.id} className={active ? "text-primary-foreground" : "text-text-secondary"} />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  Administración
                </p>
                <div className="space-y-0.5">
                  <Link
                    href={SETTINGS_HREF}
                    aria-current={isSettingsActive ? "page" : undefined}
                    onClick={onClose}
                    className={rowClass(isSettingsActive)}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      <IconGear className={cn("h-[14px] w-[14px]", isSettingsActive ? "text-primary-foreground" : "text-text-secondary")} />
                    </span>
                    <span className="min-w-0 truncate">Configuración</span>
                  </Link>
                </div>
              </section>
            </div>

            <div className="shrink-0 border-t border-border px-3 py-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
              <form action="/api/admin/logout" method="post">
                <button
                  type="submit"
                  className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-[14px] text-text-secondary transition-colors duration-150 hover:bg-surface-elevated hover:text-text-primary"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <IconLogout />
                  </span>
                  Cerrar sesión
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
