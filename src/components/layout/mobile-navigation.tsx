"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  getNavigationActiveBranchIds,
  isCatalogPathActive,
} from "@/features/catalog/hierarchy";
import type { StorefrontNavigation } from "@/types/navigation";

type MobileNavigationProps = {
  navigation: StorefrontNavigation;
  buttonClassName?: string;
};

type NavigationNode = {
  id: string;
  label: string;
  href: string;
  items?: NavigationNode[];
};

type MobileCatalogTreeProps = {
  nodes: NavigationNode[];
  expandedNodeIds: string[];
  level?: number;
  onToggleNode: (nodeId: string) => void;
  onNavigate: () => void;
  pathname: string;
};

function MobileCatalogTree({
  nodes,
  expandedNodeIds,
  level = 0,
  onToggleNode,
  onNavigate,
  pathname,
}: MobileCatalogTreeProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul className={level === 0 ? "flex flex-col" : "mt-3 grid gap-2 border-t border-neutral-200 pt-3"}>
      {nodes.map((node) => {
        const hasChildren = (node.items ?? []).length > 0;
        const isExpanded = expandedNodeIds.includes(node.id);
        const isActive = isCatalogPathActive(pathname, node.href);
        const panelId = `mobile-catalog-node-${node.id}`;

        return (
          <li
            key={node.id}
            className={level === 0 ? "border-b border-neutral-100 last:border-b-0" : "last:border-b-0"}
          >
            <div
              className={
                level === 0
                  ? "flex items-center justify-between gap-3 px-4 py-4"
                  : "flex items-center justify-between gap-3"
              }
            >
              <Link
                href={node.href}
                className={cn(
                  "min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
                  level === 0 && "text-[15px] tracking-[0.02em]",
                  level > 0 && "text-sm leading-6 text-neutral-700",
                  isActive && "font-medium text-neutral-950",
                )}
                onClick={onNavigate}
              >
                {node.label}
              </Link>

              {hasChildren ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  aria-label={isExpanded ? `Contraer ${node.label}` : `Expandir ${node.label}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
                  onClick={() => onToggleNode(node.id)}
                >
                  <span
                    className={cn(
                      "text-lg leading-none transition-transform",
                      isExpanded && "rotate-90",
                    )}
                  >
                    &gt;
                  </span>
                </button>
              ) : null}
            </div>

            {hasChildren && isExpanded ? (
              <div
                id={panelId}
                className={level === 0 ? "border-t border-neutral-100 bg-neutral-50" : "ml-4"}
              >
                <MobileCatalogTree
                  nodes={node.items ?? []}
                  expandedNodeIds={expandedNodeIds}
                  level={level + 1}
                  onToggleNode={onToggleNode}
                  onNavigate={onNavigate}
                  pathname={pathname}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function MobileNavigation({ navigation, buttonClassName }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const activeBranchIds = useMemo(
    () => getNavigationActiveBranchIds(navigation.categories, pathname),
    [navigation.categories, pathname],
  );

  const toggleNode = (nodeId: string) => {
    setExpandedNodeIds((current) =>
      current.includes(nodeId)
        ? current.filter((currentId) => currentId !== nodeId)
        : [...current, nodeId],
    );
  };

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setIsProductsOpen(false);
    setExpandedNodeIds([]);
    previousActiveElementRef.current?.focus();
    previousActiveElementRef.current = null;
  }, []);

  const toggleProductsPanel = () => {
    if (isProductsOpen) {
      setIsProductsOpen(false);
      setExpandedNodeIds([]);
      return;
    }

    setExpandedNodeIds(activeBranchIds);
    setIsProductsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  const mobilePanel = isOpen ? (
    <>
      <button
        type="button"
        aria-label="Cerrar menu"
        className="fixed inset-0 z-[70] bg-black/20 lg:hidden"
        onClick={closeMenu}
      />
      <div
        id="mobile-navigation-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        className="fixed left-0 top-0 z-[80] h-dvh w-full max-w-[390px] overflow-y-auto bg-white text-neutral-900 shadow-xl lg:hidden"
      >
        <div className="flex h-14 items-center border-b border-neutral-100 px-4">
          <h2 id="mobile-navigation-title" className="sr-only">
            Navegacion mobile
          </h2>
          <button
            type="button"
            ref={closeButtonRef}
            aria-label="Cerrar menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
            onClick={closeMenu}
          >
            <span className="relative block h-[18px] w-[18px]">
              <span className="absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 rotate-45 bg-current" />
              <span className="absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 -rotate-45 bg-current" />
            </span>
          </button>
        </div>

        <nav aria-label="Navegacion mobile" className="py-3">
          <ul className="flex flex-col">
            {navigation.primary.map((item) => (
              <li key={item.id} className="border-b border-neutral-100 last:border-b-0">
                {item.id === "productos" ? (
                  <>
                    <div className="flex items-center justify-between gap-3 px-4 py-4">
                      <Link
                        href={item.href}
                        className="min-w-0 flex-1 text-[15px] tracking-[0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
                        onClick={closeMenu}
                      >
                        {item.label}
                      </Link>
                      <button
                        type="button"
                        aria-expanded={isProductsOpen}
                        aria-controls="mobile-products-panel"
                        aria-label={isProductsOpen ? "Contraer productos" : "Expandir productos"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
                        onClick={toggleProductsPanel}
                      >
                        <span
                          className={cn(
                            "text-lg leading-none transition-transform",
                            isProductsOpen ? "rotate-90" : "rotate-0",
                          )}
                        >
                          &gt;
                        </span>
                      </button>
                    </div>

                    {isProductsOpen ? (
                      <div id="mobile-products-panel" className="border-t border-neutral-100 bg-neutral-50">
                        <MobileCatalogTree
                          nodes={navigation.categories}
                          expandedNodeIds={expandedNodeIds}
                          onToggleNode={toggleNode}
                          onNavigate={closeMenu}
                          pathname={pathname}
                        />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-4 py-4 text-[15px] tracking-[0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  ) : null;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-panel"
        aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
          buttonClassName,
        )}
        onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
      >
        <span className="flex w-[18px] flex-col gap-[4px]">
          <span
            className={cn(
              "h-px w-full bg-current transition-transform",
              isOpen && "translate-y-[5px] rotate-45",
            )}
          />
          <span className={cn("h-px w-full bg-current transition-opacity", isOpen && "opacity-0")} />
          <span
            className={cn(
              "h-px w-full bg-current transition-transform",
              isOpen && "-translate-y-[5px] -rotate-45",
            )}
          />
        </span>
      </button>
      {isMounted ? createPortal(mobilePanel, document.body) : null}
    </div>
  );
}
