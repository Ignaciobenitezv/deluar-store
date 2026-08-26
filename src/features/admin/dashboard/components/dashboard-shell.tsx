import { dashboardUi } from "../lib/dashboard-ui";
import { DashboardHeader } from "./dashboard-header";

type DashboardShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  lastUpdated?: string;
};

export function DashboardShell({ children, title = "Resumen", subtitle, lastUpdated }: DashboardShellProps) {
  return (
    <main className={`${dashboardUi.pageOuter} min-w-0`}>
      <div className={`mx-auto flex w-full min-w-0 ${dashboardUi.contentMaxWidth} px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6`}>
        <div className={`${dashboardUi.shell} min-w-0 overflow-visible`}>
          <div className="min-w-0 bg-[#f6f7fb]">
            <div className={dashboardUi.contentPadding}>
              <div className={dashboardUi.shellInner}>
                <DashboardHeader
                  viewTitle={title}
                  subtitle={subtitle}
                  lastUpdated={lastUpdated}
                  showDateRangeFilter
                />
                <div className={dashboardUi.pageStack}>{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
