import { DashboardHeader } from "./dashboard-header";
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
    <main className={dashboardUi.pageOuter}>
      <div className="mx-auto w-full max-w-[1680px] px-4 py-4 lg:px-6 lg:py-6">
        <div className={`${dashboardUi.shell} overflow-hidden`}>
          <div className={`grid ${dashboardUi.shellGrid}`}>
            <aside className="border-b border-slate-200/70 bg-white lg:min-h-[calc(100vh-3rem)] lg:border-b-0 lg:border-r">
              <div className="sticky top-0">
                <DashboardSidebar />
              </div>
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
    </main>
  );
}

