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
      <div className={`${dashboardUi.cardHeader} items-center`}>
        <div>
          <h2 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-5 lg:px-6 lg:py-6">{children}</div>
      {emptyState ? <div className="border-t border-slate-200/70 px-5 py-4">{emptyState}</div> : null}
    </section>
  );
}

