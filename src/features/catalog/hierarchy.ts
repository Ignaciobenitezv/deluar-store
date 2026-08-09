import type { NavigationCategory, NavigationCategoryItem } from "@/types/navigation";
import type { Slug } from "@/types/cms";

export type CatalogHierarchyNode = {
  _id: string;
  _type: "category" | "subcategory";
  title: string;
  slug: Slug;
  description?: string;
  order?: number;
  subcategories?: CatalogHierarchyNode[];
};

export type CatalogHierarchyResolution = {
  rootCategory: CatalogHierarchyNode;
  currentNode: CatalogHierarchyNode;
  ancestors: CatalogHierarchyNode[];
  descendantIds: string[];
  depth: 0 | 1 | 2;
  href: string;
  pathSegments: string[];
};

export function buildCatalogHref(pathSegments: string[]) {
  return pathSegments.length > 0 ? `/productos/${pathSegments.join("/")}` : "/productos";
}

export function expandReferenceIds(ids: string[]) {
  const expandedIds = new Set<string>();

  for (const id of ids) {
    if (!id) {
      continue;
    }

    expandedIds.add(id);
    expandedIds.add(`drafts.${id}`);
  }

  return [...expandedIds];
}

function collectDescendantIds(node: CatalogHierarchyNode): string[] {
  const descendantIds: string[] = [];

  for (const child of node.subcategories ?? []) {
    descendantIds.push(child._id);
    descendantIds.push(...collectDescendantIds(child));
  }

  return descendantIds;
}

function findNodeBySegments(
  node: CatalogHierarchyNode,
  pathSegments: string[],
  ancestors: CatalogHierarchyNode[] = [],
): { node: CatalogHierarchyNode; ancestors: CatalogHierarchyNode[] } | null {
  if (pathSegments.length === 0) {
    return { node, ancestors };
  }

  const [nextSegment, ...restSegments] = pathSegments;
  const nextNode = (node.subcategories ?? []).find((item) => item.slug.current === nextSegment);

  if (!nextNode) {
    return null;
  }

  return findNodeBySegments(nextNode, restSegments, [...ancestors, node]);
}

export function resolveCatalogHierarchy(
  categories: CatalogHierarchyNode[],
  categorySlug: string,
  subcategorySlugs: string[] = [],
): CatalogHierarchyResolution | null {
  if (subcategorySlugs.length > 2) {
    return null;
  }

  const rootCategory = categories.find((category) => category.slug.current === categorySlug);

  if (!rootCategory) {
    return null;
  }

  const resolution = findNodeBySegments(rootCategory, subcategorySlugs);

  if (!resolution) {
    return null;
  }

  const pathSegments = [categorySlug, ...subcategorySlugs];

  return {
    rootCategory,
    currentNode: resolution.node,
    ancestors: resolution.ancestors,
    descendantIds: collectDescendantIds(resolution.node),
    depth: Math.min(pathSegments.length - 1, 2) as 0 | 1 | 2,
    href: buildCatalogHref(pathSegments),
    pathSegments,
  };
}

export function mapCatalogHierarchyToNavigationCategories(
  categories: CatalogHierarchyNode[],
): NavigationCategory[] {
  function mapNode(
    node: CatalogHierarchyNode,
    pathSegments: string[],
  ): NavigationCategoryItem {
    const currentPathSegments = [...pathSegments, node.slug.current];

    return {
      id: node._id,
      label: node.title,
      href: buildCatalogHref(currentPathSegments),
      cmsKey: node.slug.current,
      items: (node.subcategories ?? []).map((child) => mapNode(child, currentPathSegments)),
    };
  }

  return categories.map<NavigationCategory>((category) => ({
    id: category._id,
    label: category.title,
    href: buildCatalogHref([category.slug.current]),
    cmsKey: category.slug.current,
    items: (category.subcategories ?? []).map((child) =>
      mapNode(child, [category.slug.current]),
    ),
  }));
}

export function isCatalogPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavigationLikeNode = {
  id: string;
  href: string;
  items?: NavigationLikeNode[];
};

export function getCatalogActiveBranchIds(
  categories: CatalogHierarchyNode[],
  pathname: string,
): string[] {
  const activeIds: string[] = [];

  function visit(node: CatalogHierarchyNode, pathSegments: string[]) {
    const href = buildCatalogHref(pathSegments);

    if (!isCatalogPathActive(pathname, href)) {
      return;
    }

    activeIds.push(node._id);

    for (const child of node.subcategories ?? []) {
      visit(child, [...pathSegments, child.slug.current]);
    }
  }

  for (const category of categories) {
    visit(category, [category.slug.current]);
  }

  return activeIds;
}

export function getNavigationActiveBranchIds(
  nodes: NavigationLikeNode[],
  pathname: string,
): string[] {
  const activeIds: string[] = [];

  function visit(node: NavigationLikeNode) {
    if (!isCatalogPathActive(pathname, node.href)) {
      return;
    }

    activeIds.push(node.id);

    for (const child of node.items ?? []) {
      visit(child);
    }
  }

  for (const node of nodes) {
    visit(node);
  }

  return activeIds;
}
