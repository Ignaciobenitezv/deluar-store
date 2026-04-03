import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import { CartProvider } from "@/features/cart/cart-context";

type StoreLayoutProps = {
  children: ReactNode;
};

export default async function StoreLayout({ children }: StoreLayoutProps) {
  return (
    <CartProvider>
      <SiteShell>{children}</SiteShell>
    </CartProvider>
  );
}
