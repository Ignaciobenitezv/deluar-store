"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { cn } from "@/lib/utils";
import type { StorefrontNavigation } from "@/types/navigation";

type MobileNavigationProps = {
  navigation: StorefrontNavigation;
};

export function MobileNavigation({ navigation }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryId((current) =>
      current === categoryId ? null : categoryId,
    );
  };

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-panel"
        aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-foreground/30"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="sr-only">Menu</span>
        <span className="flex w-[18px] flex-col gap-[4px]">
          <span className={cn("h-px w-full bg-current transition-transform", isOpen && "translate-y-[5px] rotate-45")} />
          <span className={cn("h-px w-full bg-current transition-opacity", isOpen && "opacity-0")} />
          <span className={cn("h-px w-full bg-current transition-transform", isOpen && "-translate-y-[5px] -rotate-45")} />
        </span>
      </button>

      {isOpen ? (
        <div
          id="mobile-navigation-panel"
          className="absolute inset-x-0 top-full border-b border-border bg-surface/98 pb-8 pt-3 shadow-[0_20px_45px_rgba(36,31,26,0.08)] backdrop-blur"
        >
          <SiteContainer className="space-y-4">
            <nav aria-label="Navegacion mobile">
              <ul className="grid gap-4">
                {navigation.primary.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[1.4rem] border border-border/75 bg-white/42 px-4 py-3"
                  >
                    {item.id === "productos" ? (
                      <>
                        <div className="flex items-center gap-3">
                          <Link
                            href={item.href}
                            className="min-w-0 flex-1 text-base tracking-[0.06em]"
                            onClick={() => setIsOpen(false)}
                          >
                            {item.label}
                          </Link>
                          <button
                            type="button"
                            aria-expanded={isProductsOpen}
                            aria-controls="mobile-products-panel"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 text-muted"
                            onClick={() => setIsProductsOpen((current) => !current)}
                          >
                            <span
                              className={cn(
                                "text-sm transition-transform",
                                isProductsOpen && "rotate-45",
                              )}
                            >
                              +
                            </span>
                          </button>
                        </div>

                        {isProductsOpen ? (
                          <ul
                            id="mobile-products-panel"
                            className="mt-4 grid gap-3 border-t border-border/75 pt-4"
                          >
                            {navigation.categories.map((category) => (
                              <li
                                key={category.id}
                                className="rounded-[1.1rem] bg-surface px-4 py-3"
                              >
                                <div className="flex items-center gap-3">
                                  <Link
                                    href={category.href}
                                    className="min-w-0 flex-1 text-sm font-medium tracking-[0.05em]"
                                    onClick={() => setIsOpen(false)}
                                  >
                                    {category.label}
                                  </Link>
                                  {category.items.length > 0 ? (
                                    <button
                                      type="button"
                                      aria-expanded={expandedCategoryId === category.id}
                                      aria-controls={`mobile-category-${category.id}`}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 text-muted"
                                      onClick={() => toggleCategory(category.id)}
                                    >
                                      <span
                                        className={cn(
                                          "text-sm transition-transform",
                                          expandedCategoryId === category.id &&
                                            "rotate-45",
                                        )}
                                      >
                                        +
                                      </span>
                                    </button>
                                  ) : null}
                                </div>

                                {category.items.length > 0 &&
                                expandedCategoryId === category.id ? (
                                  <ul
                                    id={`mobile-category-${category.id}`}
                                    className="mt-3 grid gap-2 border-t border-border/75 pt-3"
                                  >
                                    {category.items.map((subCategory) => (
                                      <li key={subCategory.id}>
                                        <Link
                                          href={subCategory.href}
                                          className="block text-sm leading-6 text-muted"
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
                        className="block text-base tracking-[0.06em]"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </SiteContainer>
        </div>
      ) : null}
    </div>
  );
}
