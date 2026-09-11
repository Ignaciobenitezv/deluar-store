import { cn } from "@/lib/utils";
import { dashboardUi } from "../lib/dashboard-ui";
import { DashboardHeader } from "./dashboard-header";

type DashboardShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  lastUpdated?: string;
  compactMobile?: boolean;
};

export function DashboardShell({
  children,
  title = "Resumen",
  subtitle,
  lastUpdated,
  compactMobile = false,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen min-w-0">
      <div
        className={cn(
          compactMobile
            ? "sm:px-4 sm:py-6 lg:px-6 lg:py-8"
            : dashboardUi.contentPadding,
        )}
      >
        <DashboardHeader
          viewTitle={title}
          subtitle={subtitle}
          lastUpdated={lastUpdated}
          showDateRangeFilter
          compactMobile={compactMobile}
        />
        <div>{children}</div>
      </div>
    </main>
  );
}
