"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  buildCatalogHref,
  getCatalogActiveBranchIds,
  isCatalogPathActive,
} from "@/features/catalog/hierarchy";
import type { CatalogHierarchyNode } from "@/features/catalog/types";

type CatalogSidebarSubcategoryTreeProps = {
  rootNode?: CatalogHierarchyNode;
  defaultOpen?: boolean;
  variant?: "desktop" | "mobile";
};

type CatalogSidebarTreeNodeProps = {
  node: CatalogHierarchyNode;
  pathSegments: string[];
  pathname: string;
  expandedIds: Set<string>;
  onToggleNode: (id: string) => void;
  variant: "desktop" | "mobile";
};

function CatalogSidebarTreeNode({
  node,
  pathSegments,
  pathname,
  expandedIds,
  onToggleNode,
  variant,
}: CatalogSidebarTreeNodeProps) {
  const hasChildren = (node.subcategories ?? []).length > 0;
  const isExpanded = hasChildren && expandedIds.has(node._id);
  const childrenId = `catalog-sidebar-subcategories-${node._id}`;
  const href = buildCatalogHref([...pathSegments, node.slug.current]);
  const isActive = isCatalogPathActive(pathname, href);

  const linkClassName =
    variant === "mobile"
      ? "block min-w-0 max-w-full flex-1 truncate py-1 text-sm leading-6 text-foreground/78 transition-colors duration-200 hover:text-foreground"
      : "block min-w-0 max-w-full flex-1 truncate py-0.5 text-[0.94rem] leading-6 text-foreground/78 transition-colors duration-200 hover:text-foreground";

  const buttonClassName =
    variant === "mobile"
      ? "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center bg-transparent text-[1.05rem] font-medium leading-none text-[#6a4a3b] transition hover:text-[#2f211b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
      : "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center bg-transparent text-[1rem] font-medium leading-none text-[#6a4a3b] transition hover:text-[#2f211b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2";

  return (
    <li className={variant === "mobile" ? "space-y-1.5" : "space-y-2"}>
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={href}
          title={node.title}
          className={cn(
            linkClassName,
            isActive && "font-medium text-[#2f211b]",
          )}
        >
          {node.title}
        </Link>

        {hasChildren ? (
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={childrenId}
            onClick={() => onToggleNode(node._id)}
            className={cn(buttonClassName, isExpanded && "text-[#2f211b]")}
          >
            <span aria-hidden="true">{isExpanded ? "" : "+"}</span>
          </button>
        ) : null}
      </div>

      {hasChildren && isExpanded ? (
        <ul
          id={childrenId}
          className={cn(
            "mt-2 border-l border-[#e3d8cb] pl-4",
            variant === "mobile" ? "space-y-1.5" : "space-y-2",
          )}
        >
          {(node.subcategories ?? []).map((child) => (
            <CatalogSidebarTreeNode
              key={child._id}
              node={child}
              pathSegments={[...pathSegments, node.slug.current]}
              pathname={pathname}
              expandedIds={expandedIds}
              onToggleNode={onToggleNode}
              variant={variant}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type CatalogSidebarSubcategoryTreeContentProps = CatalogSidebarSubcategoryTreeProps & {
  pathname: string;
};

function CatalogSidebarSubcategoryTreeContent({
  rootNode,
  defaultOpen = false,
  variant = "desktop",
  pathname,
}: CatalogSidebarSubcategoryTreeContentProps) {
  const activeBranchIds = useMemo(
    () => (rootNode ? getCatalogActiveBranchIds([rootNode], pathname) : []),
    [pathname, rootNode],
  );
  const [isSectionOpen, setIsSectionOpen] = useState(
    variant === "mobile" ? false : defaultOpen,
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(activeBranchIds),
  );

  const toggleSection = useCallback(() => {
    setIsSectionOpen((current) => !current);
  }, []);

  const toggleNode = useCallback((id: string) => {
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

  if (!rootNode || (rootNode.subcategories ?? []).length === 0) {
    return null;
  }

  const isMobile = variant === "mobile";

  return (
    <section className={cn(isMobile ? "w-full border-t border-neutral-200 py-4" : "space-y-3")}>
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "uppercase tracking-[0.18em] text-neutral-500",
            isMobile ? "text-[10px]" : "text-[11px]",
          )}
        >
          Subcategorias
        </p>
        <button
          type="button"
          aria-expanded={isSectionOpen}
          aria-controls="catalog-sidebar-subcategory-tree"
          onClick={toggleSection}
          className={cn(
            "inline-flex flex-shrink-0 items-center justify-center bg-transparent font-medium leading-none text-[#6a4a3b] transition hover:text-[#2f211b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
            isMobile ? "h-8 w-8 text-[1.15rem]" : "h-6 w-6 text-[1rem]",
          )}
        >
          <span aria-hidden="true">{isSectionOpen ? "" : "+"}</span>
        </button>
      </div>

      {isSectionOpen ? (
        <ul
          id="catalog-sidebar-subcategory-tree"
          className={cn("mt-4", isMobile ? "space-y-2" : "space-y-2.5")}
        >
          {(rootNode.subcategories ?? []).map((node) => (
            <CatalogSidebarTreeNode
              key={node._id}
              node={node}
              pathSegments={[rootNode.slug.current]}
              pathname={pathname}
              expandedIds={expandedIds}
              onToggleNode={toggleNode}
              variant={variant}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function CatalogSidebarSubcategoryTree({
  rootNode,
  defaultOpen = false,
  variant = "desktop",
}: CatalogSidebarSubcategoryTreeProps) {
  const pathname = usePathname();

  return (
    <CatalogSidebarSubcategoryTreeContent
      key={`${pathname}:${rootNode?._id ?? "none"}`}
      rootNode={rootNode}
      defaultOpen={defaultOpen}
      variant={variant}
      pathname={pathname}
    />
  );
}
