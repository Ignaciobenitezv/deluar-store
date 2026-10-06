"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Above this, the popover skips the number grid and only offers the
 * jump-to-page input — no screen in this app realistically gets anywhere
 * near it (Productos/Orders/Inventario/Ledger all page at ~20-25 items and
 * top out around 20-30 pages), but nothing here should ever render hundreds
 * of button nodes just because a filtered/huge dataset one day could.
 */
const MAX_GRID_PAGES = 150;

type AdminPaginationJumpMenuProps = {
  currentPage: number;
  totalPages: number;
  /** The *current* page's own pathname + query params, parsed server-side
   * from the real `buildHref(currentPage)` the screen already computes —
   * never re-derived or guessed. A function like `buildHref` can't cross
   * from a Server Component into this Client Component, so the parent
   * (admin-pagination.tsx, still a Server Component) does that call and
   * hands over only this plain, serializable shape. Every other filter param
   * rides along untouched; only `page` is ever rewritten, client-side. */
  pathname: string;
  searchEntries: [string, string][];
  label: string;
};

function buildLocalHref(pathname: string, searchEntries: [string, string][], targetPage: number) {
  const params = new URLSearchParams(searchEntries);

  // Matches every existing buildXHref in this app (buildAdminProductsHref,
  // buildOrdersHref, buildAdminInventoryHref, ventas' own buildHref): page 1
  // never appears in the query string.
  if (targetPage <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(targetPage));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function clampToValidPage(rawValue: string, totalPages: number) {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const truncated = Math.trunc(parsed);
  return truncated >= 1 && truncated <= totalPages ? truncated : null;
}

export function AdminPaginationJumpMenu({
  currentPage,
  totalPages,
  pathname,
  searchEntries,
  label,
}: AdminPaginationJumpMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

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
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggleOpen = () => {
    setInputValue("");
    setInputError(false);
    setOpen((value) => !value);
  };

  const handleJumpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = clampToValidPage(inputValue, totalPages);

    if (target === null) {
      setInputError(true);
      return;
    }

    setOpen(false);
    router.push(buildLocalHref(pathname, searchEntries, target));
  };

  const showGrid = totalPages <= MAX_GRID_PAGES;

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={toggleOpen}
        className="inline-flex h-8 min-w-8 items-center justify-center rounded-xl border border-transparent text-xs text-text-secondary transition-colors duration-150 hover:border-border hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-9 sm:min-w-9 sm:text-sm"
      >
        …
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className="absolute bottom-full left-1/2 z-40 mb-2 w-60 -translate-x-1/2 rounded-xl border border-border bg-surface p-2.5 shadow-[var(--admin-shadow-md)] sm:w-72"
        >
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min={1}
              max={totalPages}
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                setInputError(false);
              }}
              placeholder={`1–${totalPages}`}
              aria-label={`Ir a la página (entre 1 y ${totalPages})`}
              className={cn(
                "h-8 w-full min-w-0 rounded-lg border bg-surface px-2 text-xs text-text-primary outline-none transition-colors focus:border-primary/50 sm:text-sm",
                inputError ? "border-danger" : "border-border",
              )}
            />
            <button
              type="submit"
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-primary bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors duration-150 hover:brightness-105 sm:text-sm"
            >
              Ir
            </button>
          </form>

          {showGrid ? (
            <div className="mt-2 grid max-h-56 grid-cols-6 gap-1 overflow-y-auto pr-0.5">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
                if (pageNumber === currentPage) {
                  return (
                    <span
                      key={pageNumber}
                      aria-current="page"
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-primary bg-primary text-[11px] font-semibold text-primary-foreground"
                    >
                      {pageNumber}
                    </span>
                  );
                }

                return (
                  <Link
                    key={pageNumber}
                    href={buildLocalHref(pathname, searchEntries, pageNumber)}
                    onClick={() => setOpen(false)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface text-[11px] font-medium text-text-primary transition-colors duration-150 hover:bg-surface-elevated"
                  >
                    {pageNumber}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[11px] leading-4 text-text-secondary">
              Hay {totalPages} páginas — ingresá un número para ir directo.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
