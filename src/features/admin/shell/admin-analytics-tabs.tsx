"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AdminNavIcon } from "./admin-nav-icons";
import { TabStripBaseline, TabStripContent, TabStripIndicator } from "./tab-strip";

type AnalyticsTab = { id: string; label: string; href: string };

/** Sidebar is first-level nav only ("Estadísticas"); every Analytics-specific
 * route lives here instead, so a route never lights up two competing nav
 * entries. The six most-used sections get a permanent slot; everything else
 * real but less-trafficked collapses into "Más". */
const analyticsTabs: AnalyticsTab[] = [
  { id: "overview", label: "Resumen", href: "/admin/dashboard" },
  { id: "acquisition", label: "Adquisición", href: "/admin/dashboard/adquisicion" },
  { id: "sales", label: "Ventas", href: "/admin/dashboard/ventas" },
  { id: "conversion", label: "Conversión", href: "/admin/dashboard/conversion" },
  { id: "products-analytics", label: "Productos", href: "/admin/dashboard/productos" },
  { id: "customers", label: "Clientes", href: "/admin/dashboard/clientes" },
];

/** Pagos, Envíos y Ubicación viven en el sidebar (admin-nav-config.ts), no
 * acá — son operación del negocio, no lectura analítica. */
const moreGroups: { label: string; items: AnalyticsTab[] }[] = [
  {
    label: "Comercio",
    items: [
      { id: "abandoned-carts", label: "Carritos abandonados", href: "/admin/dashboard/abandoned-carts" },
      { id: "checkout", label: "Finalización de compra", href: "/admin/dashboard/checkout" },
    ],
  },
];

const moreItems: AnalyticsTab[] = moreGroups.flatMap((group) => group.items);

/** "/admin/dashboard" is both the Resumen tab's own href AND a literal
 * prefix of every other href here, including routes this tab bar doesn't
 * represent at all anymore (pagos, envíos, ubicación moved to the sidebar).
 * A plain startsWith match would light up Resumen on those too, so it only
 * matches exactly; every other tab keeps prefix matching for when its route
 * grows sub-pages. The longest matching href wins, keeping exactly one entry
 * active — the single sliding indicator depends on it. */
function resolveActive(pathname: string) {
  let best: { id: string; href: string } | undefined;
  for (const tab of [...analyticsTabs, ...moreItems]) {
    const matches =
      pathname === tab.href || (tab.id !== "overview" && pathname.startsWith(`${tab.href}/`));
    if (matches && (!best || tab.href.length > best.href.length)) {
      best = tab;
    }
  }

  if (!best) {
    return { activeTabId: undefined, activeMoreId: undefined };
  }

  const isMoreItem = moreItems.some((item) => item.id === best!.id);
  return {
    activeTabId: isMoreItem ? "more" : best.id,
    activeMoreId: isMoreItem ? best.id : undefined,
  };
}

function AdminAnalyticsMoreMenu({
  active,
  activeMoreId,
}: {
  active: boolean;
  activeMoreId: string | undefined;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAtPathname, setOpenedAtPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Route changed (including selecting an item inside) — the menu no longer
  // applies to whatever is now on screen. Adjusting state during render
  // (React's documented pattern for this) instead of an effect, so this
  // doesn't cost an extra render pass on every navigation.
  if (pathname !== openedAtPathname) {
    setOpenedAtPathname(pathname);
    if (open) {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex h-full shrink-0 items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="group relative flex h-full shrink-0 items-center gap-2"
      >
        <TabStripContent
          active={active}
          icon={<AdminNavIcon itemId="more" className="h-[17px] w-[17px]" />}
          label="Más"
          iconClassName="transition-colors duration-150"
        />
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={cn(
            "h-[11px] w-[11px] shrink-0 transition-transform duration-150",
            open && "rotate-180",
            active ? "text-primary" : "text-text-secondary group-hover:text-text-primary",
          )}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6.5 8 10l4-3.5" />
        </svg>
        {active && <TabStripIndicator layoutId="admin-analytics-active-indicator" />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Más secciones de analíticas"
          className="absolute left-0 top-full z-30 mt-2 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-[var(--admin-shadow-md)]"
        >
          {moreGroups.map((group, index) => (
            <div key={group.label} className={cn(index > 0 && "mt-1 border-t border-border pt-1")}>
              <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                {group.label}
              </p>
              {group.items.map((item) => {
                const itemActive = item.id === activeMoreId;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    aria-current={itemActive ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] transition-colors duration-150",
                      itemActive
                        ? "text-primary"
                        : "text-text-secondary hover:bg-background hover:text-text-primary",
                    )}
                  >
                    <AdminNavIcon
                      itemId={item.id}
                      className={cn("h-[14px] w-[14px]", itemActive ? "text-primary" : "text-text-secondary")}
                    />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminAnalyticsTabs() {
  const pathname = usePathname();
  const { activeTabId, activeMoreId } = resolveActive(pathname);

  return (
    <nav aria-label="Navegación de analíticas" className="sticky top-14 z-20 bg-background">
      <div className="relative flex h-[60px] items-center gap-10 overflow-x-auto px-6 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden lg:px-8">
        {analyticsTabs.map((tab) => {
          const active = tab.id === activeTabId;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="group relative flex h-full shrink-0 items-center gap-2.5"
            >
              <TabStripContent
                active={active}
                icon={<AdminNavIcon itemId={tab.id} className="h-[17px] w-[17px]" />}
                label={tab.label}
                iconClassName="transition-colors duration-150"
              />
              {active && <TabStripIndicator layoutId="admin-analytics-active-indicator" />}
            </Link>
          );
        })}

        <AdminAnalyticsMoreMenu active={activeTabId === "more"} activeMoreId={activeMoreId} />

        <TabStripBaseline />
      </div>
    </nav>
  );
}
