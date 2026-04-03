import { SiteContainer } from "@/components/layout/site-container";
import type { StorefrontNavigation } from "@/types/navigation";

type AnnouncementBarProps = {
  navigation: StorefrontNavigation;
};

export function AnnouncementBar({ navigation }: AnnouncementBarProps) {
  return (
    <div className="border-b border-[color:rgba(255,255,255,0.12)] bg-[var(--color-accent-strong)] text-white">
      <SiteContainer className="flex min-h-10 items-center justify-center">
        <p className="text-center text-[0.68rem] font-medium uppercase tracking-[0.24em] text-white/88 sm:text-[0.72rem]">
          {navigation.announcement}
        </p>
      </SiteContainer>
    </div>
  );
}
