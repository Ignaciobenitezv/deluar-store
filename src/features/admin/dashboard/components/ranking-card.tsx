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
      return "bg-[#c4b5a5]";
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
    <section className="overflow-hidden rounded-[12px] border border-[#e8e5e1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[12px] text-slate-400">{description}</p>
        ) : null}
      </div>
      <div className="px-5 py-4">
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="border-b border-slate-100 py-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-800">{item.title}</p>
                    {item.subtitle ? (
                      <p className="mt-0.5 text-[11px] text-slate-400">{item.subtitle}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-slate-950">{valueFormatter(item.value)}</p>
                    {item.secondaryValue ? (
                      <p className="mt-0.5 text-[11px] text-slate-400">{item.secondaryValue}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${toneBarClass(item.tone)}`}
                    style={{ width: `${Math.max(6, (item.value / maxValue) * 100)}%` }}
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
