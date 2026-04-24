import Link from "next/link";
import { cn } from "@/lib/utils";
import type { StorefrontNavigation } from "@/types/navigation";

const baseLinkClassName =
  "text-sm tracking-[0.08em] text-foreground/78 transition-colors duration-200 hover:text-foreground";

type DesktopNavigationProps = {
  navigation: StorefrontNavigation;
};

export function DesktopNavigation({ navigation }: DesktopNavigationProps) {
  return (
    <nav
      aria-label="Navegacion principal"
      className="hidden min-w-0 flex-1 self-stretch lg:block"
    >
      <ul className="flex h-full items-stretch justify-center gap-8 xl:gap-10">
        {navigation.primary.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex h-full items-stretch",
              item.id === "productos" && "group static",
            )}
          >
            {item.id === "productos" ? (
              <>
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
                    className="text-[0.62rem] text-muted transition-transform group-hover:translate-y-px"
                  >
                    +
                  </span>
                </Link>

                <div className="pointer-events-none absolute left-1/2 top-full z-30 w-screen -translate-x-1/2 border-t border-border/60 bg-[linear-gradient(180deg,rgba(255,250,244,0.995),rgba(248,242,235,0.99))] opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                  <div className="mx-auto w-full max-w-[112rem] px-6 py-9 sm:px-8 lg:px-12 xl:px-16 xl:py-11">
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
                        className="text-sm font-medium tracking-[0.08em] text-foreground/88 transition-colors hover:text-foreground"
                      >
                        Ver todo
                      </Link>
                    </div>

                    <div className="grid grid-cols-4 gap-x-12 gap-y-10 2xl:grid-cols-5 2xl:gap-x-14">
                      {navigation.categories.map((category) => (
                        <div key={category.id} className="min-w-0 space-y-4">
                          <Link
                            href={category.href}
                            className="block text-[0.9rem] font-medium tracking-[0.08em] text-foreground"
                          >
                            {category.label}
                          </Link>
                          {category.items.length > 0 ? (
                            <ul className="space-y-2.5">
                              {category.items.map((subCategory) => (
                                <li key={subCategory.id}>
                                  <Link
                                    href={subCategory.href}
                                    className="text-[0.94rem] leading-6 text-foreground/64 transition-colors hover:text-foreground"
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
              </>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  baseLinkClassName,
                  "inline-flex h-full items-center py-4 text-[0.94rem]",
                )}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
