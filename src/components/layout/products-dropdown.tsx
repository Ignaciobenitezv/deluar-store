"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavigationCategory, NavigationLink } from "@/types/navigation";

const baseLinkClassName =
  "text-sm tracking-[0.08em] text-foreground/78 transition-colors duration-200 hover:text-foreground";
const dropdownLinkHoverClassName =
  "origin-left text-[#4a3329] transition-all duration-200 ease-out hover:scale-[1.025] hover:text-[#2f211b]";

type ProductsDropdownProps = {
  item: NavigationLink;
  categories: NavigationCategory[];
};

export function ProductsDropdown({ item, categories }: ProductsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    setIsOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 150);
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
          "inline-flex h-full items-center gap-2 py-4 text-[0.94rem]",
        )}
      >
        <span>{item.label}</span>
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
        className={cn(
          "absolute left-1/2 top-full z-30 max-h-[min(560px,calc(100vh-160px))] w-[calc(100vw-40px)] max-w-none -translate-x-1/2 overflow-x-hidden overflow-y-auto border border-[#e0d5c8] bg-[linear-gradient(180deg,rgba(255,250,244,0.995),rgba(248,242,235,0.99))] shadow-[0_18px_45px_rgba(58,42,34,0.16)] transition-[opacity,transform] duration-200",
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
      >
        <div className="mx-auto w-full px-8 py-8 lg:px-12 xl:px-14">
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

          <div className="grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-x-10 gap-y-8">
            {categories.map((category) => (
              <div key={category.id} className="min-w-0 space-y-4">
                <Link
                  href={category.href}
                  className={cn(
                    dropdownLinkHoverClassName,
                    "inline-block text-[0.9rem] font-medium tracking-[0.08em]",
                  )}
                >
                  {category.label}
                </Link>
                {category.items.length > 0 ? (
                  <ul className="space-y-2.5">
                    {category.items.map((subCategory) => (
                      <li key={subCategory.id}>
                        <Link
                          href={subCategory.href}
                          className={cn(
                            dropdownLinkHoverClassName,
                            "inline-block text-[0.94rem] leading-6",
                          )}
                        >
                          {subCategory.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
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
