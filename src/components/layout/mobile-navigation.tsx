"use client";

import { useEffect, useState } from "react";
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryId((current) =>
      current === categoryId ? null : categoryId,
    );
  };

  const mobilePanel = isOpen ? (
    <>
      <button
        type="button"
        aria-label="Cerrar menu"
        className="fixed inset-0 z-[70] bg-black/20 lg:hidden"
        onClick={() => setIsOpen(false)}
      />
      <div
        id="mobile-navigation-panel"
        className="fixed left-0 top-0 z-[80] h-dvh w-full max-w-[390px] overflow-y-auto bg-white text-neutral-900 shadow-xl lg:hidden"
      >
        <div className="flex h-14 items-center border-b border-neutral-100 px-4">
          <button
            type="button"
            aria-label="Cerrar menu"
            className="inline-flex h-9 w-9 items-center justify-center text-neutral-900"
            onClick={() => setIsOpen(false)}
          >
            <span className="sr-only">Cerrar menu</span>
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
                        className="min-w-0 flex-1 text-[15px] tracking-[0.02em]"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </Link>
                      <button
                        type="button"
                        aria-expanded={isProductsOpen}
                        aria-controls="mobile-products-panel"
                        className="inline-flex h-8 w-8 items-center justify-center text-neutral-500"
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
                                className="min-w-0 flex-1 text-sm font-medium tracking-[0.02em]"
                                onClick={() => setIsOpen(false)}
                              >
                                {category.label}
                              </Link>
                              {category.items.length > 0 ? (
                                <button
                                  type="button"
                                  aria-expanded={expandedCategoryId === category.id}
                                  aria-controls={`mobile-category-${category.id}`}
                                  className="inline-flex h-8 w-8 items-center justify-center text-neutral-500"
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
                                      className="block text-sm leading-6 text-neutral-600"
                                      onClick={() => setIsOpen(false)}
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
                    className="flex items-center justify-between px-4 py-4 text-[15px] tracking-[0.02em]"
                    onClick={() => setIsOpen(false)}
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
          "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-foreground/30",
          buttonClassName,
        )}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="sr-only">Menu</span>
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
