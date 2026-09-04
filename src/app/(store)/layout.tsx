import { Suspense, type ReactNode } from "react";
import { WhatsAppFloatingButton } from "@/components/layout/whatsapp-floating-button";
import { SiteShell } from "@/components/layout/site-shell";
import { StorefrontAnalyticsBridge } from "@/features/analytics/components/storefront-analytics-bridge";
import { CartProvider } from "@/features/cart/cart-context";

type StoreLayoutProps = {
  children: ReactNode;
};

export default async function StoreLayout({ children }: StoreLayoutProps) {
  return (
    <CartProvider>
      <Suspense fallback={null}>
        <StorefrontAnalyticsBridge />
      </Suspense>
      <SiteShell>{children}</SiteShell>
      <WhatsAppFloatingButton />
    </CartProvider>
  );
}
