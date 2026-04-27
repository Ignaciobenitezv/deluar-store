import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProductsDropdown } from "@/components/layout/products-dropdown";
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
        {navigation.primary.map((item) =>
          item.id === "productos" ? (
            <ProductsDropdown
              key={item.id}
              item={item}
              categories={navigation.categories}
            />
          ) : (
            <li key={item.id} className="flex h-full items-stretch">
              <Link
                href={item.href}
                className={cn(
                  baseLinkClassName,
                  "inline-flex h-full items-center py-4 text-[0.94rem]",
                )}
              >
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
