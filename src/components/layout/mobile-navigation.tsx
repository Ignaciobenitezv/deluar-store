"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { StorefrontNavigation } from "@/types/navigation";

type MobileNavigationProps = {
  navigation: StorefrontNavigation;
  buttonClassName?: string;
};

export function MobileNavigation({ navigation, buttonClassName }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryId((current) =>
      current === categoryId ? null : categoryId,
    );
  };

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setIsProductsOpen(false);
    setExpandedCategoryId(null);
    previousActiveElementRef.current?.focus();
    previousActiveElementRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
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
              <li
                key={item.id}
                className="border-b border-neutral-100 last:border-b-0"
              >
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
                        onClick={() => setIsProductsOpen((current) => !current)}
                      >
                        <span
                          className={cn(
                            "text-lg leading-none transition-transform",
                            isProductsOpen ? "rotate-90" : "rotate-0",
                          )}
                        >
                          ›
                        </span>
                      </button>
                    </div>

                    {isProductsOpen ? (
                      <ul
                        id="mobile-products-panel"
                        className="border-t border-neutral-100 bg-neutral-50"
                      >
                        {navigation.categories.map((category) => (
                          <li
                            key={category.id}
                            className="border-b border-neutral-100 px-4 py-3 last:border-b-0"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <Link
                                href={category.href}
                                className="min-w-0 flex-1 text-sm font-medium tracking-[0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
                                onClick={closeMenu}
                              >
                                {category.label}
                              </Link>
                              {category.items.length > 0 ? (
                                <button
                                  type="button"
                                  aria-expanded={expandedCategoryId === category.id}
                                  aria-controls={`mobile-category-${category.id}`}
                                  aria-label={
                                    expandedCategoryId === category.id
                                      ? `Contraer ${category.label}`
                                      : `Expandir ${category.label}`
                                  }
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
                                  onClick={() => toggleCategory(category.id)}
                                >
                                  <span
                                    className={cn(
                                      "text-lg leading-none transition-transform",
                                      expandedCategoryId === category.id &&
                                        "rotate-90",
                                    )}
                                  >
                                    ›
                                  </span>
                                </button>
                              ) : null}
                            </div>

                            {category.items.length > 0 &&
                            expandedCategoryId === category.id ? (
                              <ul
                                id={`mobile-category-${category.id}`}
                                className="mt-3 grid gap-2 border-t border-neutral-200 pt-3"
                              >
                                {category.items.map((subCategory) => (
                                  <li key={subCategory.id}>
                                    <Link
                                      href={subCategory.href}
                                      className="block text-sm leading-6 text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
                                      onClick={closeMenu}
                                    >
                                      {subCategory.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                      </ul>
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
          <span className={cn("h-px w-full bg-current transition-transform", isOpen && "translate-y-[5px] rotate-45")} />
          <span className={cn("h-px w-full bg-current transition-opacity", isOpen && "opacity-0")} />
          <span className={cn("h-px w-full bg-current transition-transform", isOpen && "-translate-y-[5px] -rotate-45")} />
        </span>
      </button>
      {isMounted ? createPortal(mobilePanel, document.body) : null}
    </div>
  );
}
