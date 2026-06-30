import { dashboardUi } from "../lib/dashboard-ui";

type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
};

export function ChartCard({ title, description, children, emptyState }: ChartCardProps) {
  return (
    <section className={dashboardUi.card}>
      <div className={dashboardUi.cardHeader}>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-[13px] leading-5 text-slate-500 sm:text-sm sm:leading-6">{description}</p>
          ) : null}
        </div>
      </div>
      <div className={dashboardUi.cardBody}>{children}</div>
      {emptyState ? <div className="px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">{emptyState}</div> : null}
    </section>
  );
}
