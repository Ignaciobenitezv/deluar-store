import Link from "next/link";
import { siteConfig } from "@/config/site";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
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
    <header className="sticky top-0 z-40">
      <div className="relative border-b border-[#e7ddd2] bg-white lg:hidden">
        <div className="relative flex h-14 items-center px-4">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <MobileNavigation
              navigation={navigation}
              buttonClassName="h-9 w-9 rounded-none border-0 bg-transparent hover:border-0"
            />
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link href="/" className="inline-flex flex-col items-center text-center">
              <span className="text-[1rem] font-semibold tracking-[0.28em] text-foreground">
                {siteConfig.name}
              </span>
            </Link>
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <CartTrigger variant="mobile" />
          </div>
        </div>

        <form action="/productos" className="border-t border-[#efe5db] px-4 py-2.5">
          <div className="relative">
            <input
              type="search"
              name="q"
              placeholder="Buscar productos"
              className="h-10 w-full rounded-full border border-neutral-200 bg-[#f7f4ef] px-4 pr-10 text-[13px] text-foreground outline-none placeholder:text-[12px] placeholder:text-muted"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path strokeLinecap="round" d="m16 16 4 4" />
              </svg>
            </span>
          </div>
        </form>
      </div>

      <div className="hidden bg-white lg:block">
        <div className="relative mx-auto flex h-24 w-full max-w-[112rem] items-center px-8 lg:px-12 xl:px-16">
          <form action="/productos" className="absolute left-8 top-1/2 w-[220px] -translate-y-1/2 lg:left-12 xl:left-16 xl:w-[240px]">
            <div className="relative">
              <input
                type="search"
                name="q"
                placeholder="Buscar"
                className="h-[38px] w-full rounded-full border border-neutral-200 bg-[#faf6f1] px-4 pr-10 text-sm text-foreground outline-none placeholder:text-muted"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path strokeLinecap="round" d="m16 16 4 4" />
                </svg>
              </span>
            </div>
          </form>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link href="/" className="inline-flex flex-col items-center text-center">
              <span className="text-[1.45rem] font-semibold tracking-[0.28em] text-foreground">
                {siteConfig.name}
              </span>
              <span className="mt-1 text-[0.62rem] uppercase tracking-[0.26em] text-muted">
                hogar y decoracion
              </span>
            </Link>
          </div>

          <div className="absolute right-8 top-1/2 -translate-y-1/2 lg:right-12 xl:right-16">
            <CartTrigger />
          </div>
        </div>

        <div className="border-t border-neutral-100">
          <div className="mx-auto w-full max-w-[112rem] px-8 lg:px-12 xl:px-16">
            <DesktopNavigation navigation={navigation} />
          </div>
        </div>
      </div>
      <AnnouncementBar navigation={navigation} className="hidden lg:block" />
      <CartDrawer />
    </header>
  );
}
