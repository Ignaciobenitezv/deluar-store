"use client";

import { useEffect } from "react";
import { useAdminInventoryPendingChanges } from "../context/admin-inventory-pending-changes-context";

const CONFIRM_MESSAGE = "Tenés cambios de stock sin guardar. Si salís ahora se van a perder.";

/**
 * Two independent guards, both only active while there are pending changes:
 * `beforeunload` covers closing the tab, refreshing, or typing a new URL —
 * the browser's own native dialog, unavoidable for that case. For in-app
 * navigation (clicking the Productos/Categorías tab, the sidebar, "Volver al
 * panel", a pagination link, etc.) there's no official Next.js App Router
 * "confirm before navigating" hook, so this intercepts left-clicks on any
 * internal `<a>` that would leave /admin/productos/inventario, at the
 * document level, in the capture phase (before Next's own Link handler
 * gets it) — deliberately not wired into AdminProductsModuleTabs or any
 * shared nav component, so nothing outside Inventario needs to know this
 * guard exists.
 */
export function AdminInventoryLeaveGuard() {
  const { pendingCount } = useAdminInventoryPendingChanges();

  useEffect(() => {
    if (pendingCount === 0) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = CONFIRM_MESSAGE;
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      let destination: URL;
      try {
        destination = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) {
        return;
      }

      if (destination.pathname.startsWith("/admin/productos/inventario")) {
        return;
      }

      const confirmed = window.confirm(CONFIRM_MESSAGE);
      if (!confirmed) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClickCapture, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClickCapture, true);
    };
  }, [pendingCount]);

  return null;
}
