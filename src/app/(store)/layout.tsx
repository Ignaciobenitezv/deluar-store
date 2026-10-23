import { Suspense, type ReactNode } from "react";
import { WhatsAppFloatingButton } from "@/components/layout/whatsapp-floating-button";
import { SiteShell } from "@/components/layout/site-shell";
import { StorefrontAnalyticsBridge } from "@/features/analytics/components/storefront-analytics-bridge";
import { CartProvider } from "@/features/cart/cart-context";
import { getStorefrontCopy } from "@/features/storefront-copy/server/get-storefront-copy";
import { StorefrontThemeStyle } from "@/features/theme/components/storefront-theme-style";
import { ThemePreviewBanner } from "@/features/theme/components/theme-preview-banner";
import { getStorefrontTheme } from "@/features/theme/server/get-storefront-theme";

type StoreLayoutProps = {
  children: ReactNode;
};

export default async function StoreLayout({ children }: StoreLayoutProps) {
  const [theme, { copy, preview: copyPreview }] = await Promise.all([getStorefrontTheme(), getStorefrontCopy()]);

  return (
    <>
      {/* First, so every storefront route (and its portals) paints themed. */}
      <StorefrontThemeStyle tokens={theme.tokens} />
      <CartProvider>
        <Suspense fallback={null}>
          <StorefrontAnalyticsBridge />
        </Suspense>
        <SiteShell>{children}</SiteShell>
        <WhatsAppFloatingButton copy={copy.whatsapp} />
        {theme.preview || copyPreview ? <ThemePreviewBanner preview={theme.preview} copyPreview={copyPreview} /> : null}
      </CartProvider>
    </>
  );
}
