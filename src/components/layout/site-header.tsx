import Link from "next/link";
import { siteConfig } from "@/config/site";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { CartTrigger } from "@/features/cart/components/cart-trigger";
import { DesktopNavigation } from "@/components/layout/desktop-navigation";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import type { StorefrontNavigation } from "@/types/navigation";

type SiteHeaderProps = {
  navigation: StorefrontNavigation;
};

export function SiteHeader({ navigation }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/75 bg-surface/95 backdrop-blur-xl">
      <div className="relative mx-auto w-full max-w-[112rem] px-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid min-h-[5.5rem] grid-cols-[auto_1fr_auto] items-center gap-4 lg:min-h-[6.5rem] lg:gap-10">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex flex-col">
              <span className="text-[1.45rem] font-semibold tracking-[0.28em] text-foreground">
                {siteConfig.name}
              </span>
              <span className="mt-1 text-[0.62rem] uppercase tracking-[0.26em] text-muted">
                hogar y decoracion
              </span>
            </Link>
          </div>

          <DesktopNavigation navigation={navigation} />

          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Abrir busqueda"
              className="hidden h-11 items-center rounded-full border border-border bg-white/75 px-4 text-sm text-muted transition-colors hover:border-foreground/30 hover:text-foreground sm:inline-flex"
            >
              Buscar
            </button>
            <CartTrigger />
            <MobileNavigation navigation={navigation} />
          </div>
        </div>
        <CartDrawer />
      </div>
    </header>
  );
}
