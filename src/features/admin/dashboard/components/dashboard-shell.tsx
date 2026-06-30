import { DashboardHeader } from "./dashboard-header";
import { DashboardMobileMenu } from "./dashboard-mobile-menu";
import { DashboardSidebar } from "./dashboard-sidebar";
import { dashboardUi } from "../lib/dashboard-ui";

type DashboardShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  lastUpdated?: string;
};

export function DashboardShell({ children, title = "Resumen", subtitle, lastUpdated }: DashboardShellProps) {
  return (
    <main className={`${dashboardUi.pageOuter} overflow-x-clip`}>
      <div className={`mx-auto w-full ${dashboardUi.contentMaxWidth} px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6`}>
        <div className={`${dashboardUi.shell} overflow-hidden`}>
          <div className={`grid ${dashboardUi.shellGrid}`}>
            <aside className="hidden min-w-0 bg-white lg:block lg:min-h-[calc(100vh-3rem)] lg:border-r">
              <DashboardSidebar />
            </aside>

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
      </div>

      <DashboardMobileMenu />
    </main>
  );
}
