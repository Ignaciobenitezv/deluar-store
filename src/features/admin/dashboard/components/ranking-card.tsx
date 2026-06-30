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
  const mobileItems = items.slice(0, 3);
  const hiddenMobileCount = Math.max(0, items.length - mobileItems.length);

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
      <div className={dashboardUi.cardBody}>
        {items.length > 0 ? (
          <>
            <div className="space-y-2 sm:hidden">
              {mobileItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[16px] border border-slate-200/60 bg-white px-3 py-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      {item.subtitle ? (
                        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{item.subtitle}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-950">{valueFormatter(item.value)}</p>
                      {item.secondaryValue ? (
                        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                          {item.secondaryValue}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${toneBarClass(item.tone)}`}
                      style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {hiddenMobileCount > 0 ? (
                <p className="px-1 text-xs text-slate-500">
                  Ver detalle en desktop · +{hiddenMobileCount} elementos más
                </p>
              ) : null}
            </div>

            <div className="hidden sm:block">
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
                        <p className="text-sm font-semibold text-slate-950">{valueFormatter(item.value)}</p>
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
            </div>
          </>
        ) : (
          emptyState
        )}
      </div>
    </section>
  );
}
