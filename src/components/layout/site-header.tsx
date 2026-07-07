"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { CartTrigger } from "@/features/cart/components/cart-trigger";
import { DesktopNavigation } from "@/components/layout/desktop-navigation";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { cn } from "@/lib/utils";
import type { StorefrontNavigation } from "@/types/navigation";

type SiteHeaderProps = {
  navigation: StorefrontNavigation;
};

export function SiteHeader({ navigation }: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-white transition-all duration-300 ease-in-out",
        isScrolled && "shadow-sm backdrop-blur-sm",
      )}
    >
      <div className="relative border-b border-[#e7ddd2] bg-white lg:hidden">
        <div
          className={cn(
            "relative flex items-center px-4 transition-all duration-300 ease-in-out",
            isScrolled ? "h-12" : "h-14",
          )}
        >
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <MobileNavigation
              navigation={navigation}
              buttonClassName="h-9 w-9 rounded-none border-0 bg-transparent hover:border-0"
            />
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link href="/" className="inline-flex items-center justify-center">
              <div className="flex items-center justify-center">
                <Image
                  src="/4.png"
                  alt="Deluar"
                  width={80}
                  height={40}
                  priority
                  className="block h-12 w-auto object-contain sm:hidden"
                />
              </div>
            </Link>
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <CartTrigger variant="mobile" />
          </div>
        </div>

        <form
          action="/productos"
          className={cn(
            "border-t border-[#efe5db] px-4 transition-all duration-300 ease-in-out",
            isScrolled ? "py-2" : "py-2.5",
          )}
        >
          <div className="relative">
            <input
              type="search"
              name="q"
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              className={cn(
                "w-full rounded-full border border-neutral-200 bg-[#f7f4ef] px-4 pr-10 text-[13px] text-foreground outline-none placeholder:text-[12px] placeholder:text-muted transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
                isScrolled ? "h-9" : "h-10",
              )}
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
        <div
          className={cn(
            "relative mx-auto flex w-full max-w-[112rem] items-center px-8 transition-all duration-300 ease-in-out lg:px-12 xl:px-16",
            isScrolled ? "h-20" : "h-24",
          )}
        >
          <form action="/productos" className="absolute left-8 top-1/2 w-[220px] -translate-y-1/2 lg:left-12 xl:left-16 xl:w-[240px]">
            <div className="relative">
              <input
                type="search"
                name="q"
                placeholder="Buscar"
                aria-label="Buscar productos"
                className={cn(
                  "w-full rounded-full border border-neutral-200 bg-[#faf6f1] px-4 pr-10 text-sm text-foreground outline-none placeholder:text-muted transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2",
                  isScrolled ? "h-9" : "h-[38px]",
                )}
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
            <Link href="/" className="inline-flex items-center justify-center">
              <div className="flex items-center justify-center">
                <Image
                  src="/deluarlogo.png"
                  alt="Deluar Hogar y Decoración"
                  width={180}
                  height={80}
                  priority
                  className="hidden h-12 w-auto object-contain sm:block"
                />
              </div>
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
