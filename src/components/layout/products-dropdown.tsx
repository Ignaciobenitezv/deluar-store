"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavigationCategory, NavigationLink } from "@/types/navigation";
import { getNavigationActiveBranchIds, isCatalogPathActive } from "@/features/catalog/hierarchy";

const baseLinkClassName =
  "text-sm tracking-[0.08em] text-foreground/78 transition-colors duration-200 hover:text-foreground";
const dropdownLinkHoverClassName =
  "origin-left text-[#4a3329] transition-all duration-200 ease-out hover:scale-[1.025] hover:text-[#2f211b]";

type ProductsDropdownProps = {
  item: NavigationLink;
  categories: NavigationCategory[];
};

type DropdownTreeProps = {
  items: NavigationCategory["items"];
  pathname: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  depth?: number;
};

function DropdownTree({
  items,
  pathname,
  expandedIds,
  onToggle,
  depth = 0,
}: DropdownTreeProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      className={cn(
        "min-w-0 space-y-2.5",
        depth > 0 && "mt-2 border-l border-[#e3d8cb] pl-4",
        depth > 1 && "space-y-2",
      )}
    >
      {items.map((item) => {
        const isActive = isCatalogPathActive(pathname, item.href);
        const hasChildren = (item.items ?? []).length > 0;
        const isExpanded = hasChildren && expandedIds.has(item.id);
        const childrenId = `products-dropdown-children-${item.id}`;

        return (
          <li key={item.id} className="space-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={item.href}
                className={cn(
                  dropdownLinkHoverClassName,
                  "block min-w-0 flex-1 max-w-full overflow-hidden whitespace-nowrap truncate leading-6",
                  depth === 0 && "text-[0.94rem]",
                  depth === 1 && "text-[0.92rem]",
                  depth >= 2 && "text-[0.88rem]",
                  isActive && "font-medium text-[#2f211b]",
                )}
                title={item.label}
              >
                {item.label}
              </Link>

              {hasChildren && depth >= 1 ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={childrenId}
                  onClick={() => onToggle(item.id)}
                  className={cn(
                    "inline-flex h-7 w-7 flex-shrink-0 items-center justify-center bg-transparent text-[1rem] font-medium leading-none text-[#6a4a3b] transition hover:text-[#2f211b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
                    isExpanded && "text-[#2f211b]",
                  )}
                >
                  <span aria-hidden="true">{isExpanded ? "" : "+"}</span>
                </button>
              ) : null}
            </div>

            {hasChildren && isExpanded ? (
              <div id={childrenId}>
                <DropdownTree
                  items={item.items ?? []}
                  pathname={pathname}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  depth={depth + 1}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ProductsDropdown({ item, categories }: ProductsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const activeBranchIds = useMemo(
    () => new Set(getNavigationActiveBranchIds(categories, pathname)),
    [categories, pathname],
  );

  useEffect(() => {
    setExpandedIds(activeBranchIds);
  }, [activeBranchIds]);

  const open = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    if (!isOpen && dropdownRef.current) {
      dropdownRef.current.scrollTop = 0;
    }
    setIsOpen(true);
  }, [isOpen]);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 150);
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  return (
    <li
      className="flex h-full items-stretch"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={item.href}
        className={cn(
          baseLinkClassName,
          "inline-flex h-full min-w-0 items-center gap-2 py-4 text-[0.94rem]",
        )}
        title={item.label}
      >
        <span className="min-w-0 truncate">{item.label}</span>
        <span
          aria-hidden="true"
          className={cn(
            "text-[0.62rem] text-muted transition-transform duration-200",
            isOpen && "translate-y-px",
          )}
        >
          +
        </span>
      </Link>

      <div
        ref={dropdownRef}
        className={cn(
          "absolute left-1/2 top-full z-[60] max-h-[420px] w-[min(1040px,calc(100vw-80px))] max-w-none -translate-x-1/2 overflow-x-hidden overflow-y-auto rounded-b-2xl border border-[#e0d5c8] bg-[linear-gradient(180deg,rgba(255,250,244,0.995),rgba(248,242,235,0.99))] shadow-[0_24px_70px_rgba(58,42,34,0.24)] transition-[opacity,transform] duration-200 [scrollbar-color:#8a6a58_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#b8a596] [&::-webkit-scrollbar-thumb:hover]:bg-[#8a6a58] [&::-webkit-scrollbar-track]:bg-transparent min-[1281px]:max-h-[min(460px,calc(100vh-240px))] min-[1281px]:w-[min(1180px,calc(100vw-96px))] min-[1440px]:max-h-[560px] min-[1440px]:w-[calc(100vw-40px)] [@media(max-height:800px)]:max-h-[min(460px,calc(100vh-240px))] [@media(max-height:800px)]:w-[min(1180px,calc(100vw-96px))] [@media(max-height:800px)]:max-[1280px]:max-h-[420px] [@media(max-height:800px)]:max-[1280px]:w-[min(1040px,calc(100vw-80px))] [transform-origin:top_center]",
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
      >
        <div className="mx-auto w-full px-8 py-6 min-[1440px]:px-14 min-[1440px]:py-8">
          <div className="mb-8 flex items-end justify-between gap-6 border-b border-border/60 pb-5">
            <div className="space-y-2.5">
              <p className="text-[0.67rem] uppercase tracking-[0.28em] text-muted">
                Productos
              </p>
              <p className="max-w-xl text-sm leading-6 text-foreground/72">
                Explora las categorias principales de DELUAR.
              </p>
            </div>
            <Link
              href={item.href}
              className={cn(
                dropdownLinkHoverClassName,
                "inline-block text-sm font-medium tracking-[0.08em]",
              )}
            >
              Ver todo
            </Link>
          </div>

          <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-8 gap-y-7 min-[1440px]:grid-cols-[repeat(auto-fit,minmax(155px,1fr))] min-[1440px]:gap-x-10 min-[1440px]:gap-y-8">
            {categories.map((category) => (
              <div key={category.id} className="min-w-0 space-y-4 overflow-hidden">
                <Link
                  href={category.href}
                  className={cn(
                    dropdownLinkHoverClassName,
                    "block w-full max-w-full overflow-hidden whitespace-nowrap truncate text-[0.9rem] font-medium tracking-[0.08em]",
                    isCatalogPathActive(pathname, category.href) && "text-[#2f211b]",
                  )}
                  title={category.label}
                >
                  {category.label}
                </Link>
                {category.items.length > 0 ? (
                  <DropdownTree
                    items={category.items}
                    pathname={pathname}
                    expandedIds={expandedIds}
                    onToggle={toggleExpanded}
                    depth={1}
                  />
                ) : (
                  <p className="text-[0.94rem] leading-6 text-foreground/64">
                    Seleccion curada para regalar.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
