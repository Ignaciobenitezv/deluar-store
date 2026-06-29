import { dashboardUi } from "../lib/dashboard-ui";
import { formatDashboardNumber } from "../lib/dashboard-formatters";
import type { DashboardRankingItem } from "../types/dashboard";

type RankingCardProps = {
  title: string;
  description?: string;
  items: DashboardRankingItem[];
  emptyState?: React.ReactNode;
  valueFormatter?: (value: number) => string;
};

function toneBarClass(tone?: DashboardRankingItem["tone"]) {
  switch (tone) {
    case "success":
      return "bg-emerald-400";
    case "warning":
      return "bg-amber-400";
    case "accent":
      return "bg-sky-400";
    case "danger":
      return "bg-rose-400";
    default:
      return "bg-slate-300";
  }
}

export function RankingCard({
  title,
  description,
  items,
  emptyState,
  valueFormatter = formatDashboardNumber,
}: RankingCardProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className={dashboardUi.card}>
      <div className={dashboardUi.cardHeader}>
        <div>
          <h2 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-5 lg:px-6 lg:py-6">
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                    {item.subtitle ? <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {valueFormatter(item.value)}
                    </p>
                    {item.secondaryValue ? (
                      <p className="mt-1 text-xs text-slate-500">{item.secondaryValue}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${toneBarClass(item.tone)}`}
                    style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          emptyState
        )}
      </div>
    </section>
  );
}
