import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { ReviewBanner } from "@/components/layout/review-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { StorefrontCopy } from "@/features/storefront-copy/fields";
import { getStorefrontCopy } from "@/features/storefront-copy/server/get-storefront-copy";
import { getStorefrontNavigation } from "@/integrations/sanity/navigation";

type SiteShellProps = {
  children: ReactNode;
  className?: string;
};

// Primary menu link id → its label in Configuración → Textos → Menú.
const NAVIGATION_LABELS: Record<string, keyof StorefrontCopy["navigation"]> = {
  inicio: "home",
  productos: "products",
  contacto: "contact",
  "politica-de-devolucion": "returns",
  "como-comprar": "howToBuy",
};

export async function SiteShell({ children, className }: SiteShellProps) {
  const [baseNavigation, { copy }] = await Promise.all([getStorefrontNavigation(), getStorefrontCopy()]);
  // The announcement and the menu labels are edited in Configuración → Textos.
  const navigation = {
    ...baseNavigation,
    announcement: copy.announcement.text,
    primary: baseNavigation.primary.map((link) => {
      const labelKey = NAVIGATION_LABELS[link.id];
      return labelKey ? { ...link, label: copy.navigation[labelKey] } : link;
    }),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ReviewBanner />
      <AnnouncementBar navigation={navigation} className="lg:hidden" />
      <SiteHeader navigation={navigation} />
      <main className={cn("flex-1 pb-14 pt-0 sm:pb-16", className)}>
        {children}
      </main>
      <SiteFooter navigation={navigation} copy={copy.footer} contact={copy.contact} />
    </div>
  );
}
