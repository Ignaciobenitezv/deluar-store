import type { ReadonlyURLSearchParams } from "next/navigation";

export const CATALOG_PAGE_SIZES = [24, 36, 48] as const;
export type CatalogPageSize = (typeof CATALOG_PAGE_SIZES)[number];

export const DEFAULT_CATALOG_PAGE_SIZE: CatalogPageSize = 24;

export type CatalogPagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
  previousPage: number | null;
  nextPage: number | null;
};

export type CatalogSearchParamsSource =
  | string
  | URLSearchParams
  | ReadonlyURLSearchParams
  | Record<string, string | string[] | undefined>;

export type CatalogPageWindowItem = number | "ellipsis";

export function normalizeCatalogPageSize(value: number | undefined) {
  if (value === 36 || value === 48) {
    return value;
  }

  return DEFAULT_CATALOG_PAGE_SIZE;
}

export function parseCatalogPageSearchParam(value: string | string[] | undefined) {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = normalizedValue ? Number.parseInt(normalizedValue, 10) : Number.NaN;

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

export function parseCatalogPageSizeSearchParam(value: string | string[] | undefined) {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = normalizedValue ? Number.parseInt(normalizedValue, 10) : Number.NaN;

  return normalizeCatalogPageSize(Number.isFinite(parsedValue) ? parsedValue : undefined);
}

export function normalizeCatalogPage(page: number | undefined, totalPages: number) {
  if (totalPages <= 1) {
    return 1;
  }

  if (typeof page !== "number" || !Number.isFinite(page) || page <= 0) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(page), 1), totalPages);
}

export function toCatalogSearchParams(source: CatalogSearchParamsSource) {
  if (typeof source === "string") {
    return new URLSearchParams(source);
  }

  if (source instanceof URLSearchParams) {
    return new URLSearchParams(source.toString());
  }

  if (
    typeof source === "object" &&
    source !== null &&
    "entries" in source &&
    typeof (source as { entries: unknown }).entries === "function"
  ) {
    const entriesSource = source as unknown as {
      entries: () => IterableIterator<[string, string]>;
    };
    const entries = entriesSource.entries();
    return new URLSearchParams(Array.from(entries));
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        searchParams.set(key, value[0] ?? "");
      }
      continue;
    }

    if (typeof value === "string" && value.length > 0) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

export function buildCatalogHrefWithSearchParams(
  basePath: string,
  source: CatalogSearchParamsSource,
) {
  const searchParams = toCatalogSearchParams(source);
  const queryString = searchParams.toString();

  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function buildCatalogPageHref(
  basePath: string,
  source: CatalogSearchParamsSource,
  page: number,
) {
  const searchParams = toCatalogSearchParams(source);

  if (page <= 1) {
    searchParams.delete("page");
  } else {
    searchParams.set("page", String(page));
  }

  return buildCatalogHrefWithSearchParams(basePath, searchParams);
}

export function buildCatalogPageSizeHref(
  basePath: string,
  source: CatalogSearchParamsSource,
  pageSize: number | undefined,
) {
  const searchParams = toCatalogSearchParams(source);
  const normalizedPageSize = normalizeCatalogPageSize(pageSize);

  if (normalizedPageSize === DEFAULT_CATALOG_PAGE_SIZE) {
    searchParams.delete("perPage");
  } else {
    searchParams.set("perPage", String(normalizedPageSize));
  }

  searchParams.delete("page");

  return buildCatalogHrefWithSearchParams(basePath, searchParams);
}

export function paginateCatalogItems<T>(
  items: T[],
  requestedPage?: number,
  pageSize: number = DEFAULT_CATALOG_PAGE_SIZE,
) {
  const totalItems = items.length;
  const normalizedPageSize = normalizeCatalogPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const currentPage = normalizeCatalogPage(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * normalizedPageSize;
  const endIndex = startIndex + normalizedPageSize;

  return {
    items: items.slice(startIndex, endIndex),
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      pageSize: normalizedPageSize,
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages,
      previousPage: currentPage > 1 ? currentPage - 1 : null,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
    } satisfies CatalogPagination,
  };
}

export function buildCatalogPageWindow(
  currentPage: number,
  totalPages: number,
  maxVisiblePages = 5,
): CatalogPageWindowItem[] {
  if (totalPages <= 1) {
    return [1];
  }

  if (totalPages <= maxVisiblePages + 2) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const windowSize = Math.max(1, maxVisiblePages);
  const halfWindow = Math.floor(windowSize / 2);
  const safeCurrent = Math.min(Math.max(currentPage, 1), totalPages);

  let start = Math.max(2, safeCurrent - halfWindow);
  const end = Math.min(totalPages - 1, start + windowSize - 1);

  if (end - start + 1 < windowSize) {
    start = Math.max(2, end - windowSize + 1);
  }

  const items: CatalogPageWindowItem[] = [1];

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);

  return items;
}
