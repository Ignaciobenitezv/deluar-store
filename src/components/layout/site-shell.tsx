import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getStorefrontNavigation } from "@/integrations/sanity/navigation";

type SiteShellProps = {
  children: ReactNode;
  className?: string;
};

export async function SiteShell({ children, className }: SiteShellProps) {
  const navigation = await getStorefrontNavigation();

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar navigation={navigation} />
      <SiteHeader navigation={navigation} />
      <main className={cn("flex-1 pb-14 pt-8 sm:pb-16 sm:pt-10", className)}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
