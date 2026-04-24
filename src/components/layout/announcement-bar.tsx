import { cn } from "@/lib/utils";
import { SiteContainer } from "@/components/layout/site-container";
import type { StorefrontNavigation } from "@/types/navigation";

type AnnouncementBarProps = {
  navigation: StorefrontNavigation;
  className?: string;
};

export function AnnouncementBar({ navigation, className }: AnnouncementBarProps) {
  return (
    <div
      className={cn(
        "border-b border-[color:rgba(255,255,255,0.12)] bg-[var(--color-accent-strong)] text-white",
        className,
      )}
    >
      <SiteContainer className="flex items-center justify-center py-1 sm:py-1.5">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-white sm:text-xs">
          {navigation.announcement}
        </p>
      </SiteContainer>
    </div>
  );
}
