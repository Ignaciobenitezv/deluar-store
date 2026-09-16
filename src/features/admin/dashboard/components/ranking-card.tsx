import { cn } from "@/lib/utils";
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
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "accent":
      return "bg-info";
    case "danger":
      return "bg-danger";
    default:
      return "bg-primary";
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
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h2>
        {description ? <p className="mt-0.5 text-[11.5px] text-text-secondary">{description}</p> : null}
      </div>
      <div className="px-4 py-2">
        {items.length > 0 ? (
          <div>
            {items.map((item) => (
              <div key={item.id} className="border-b border-border py-2.5 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-text-primary">{item.title}</p>
                    {item.subtitle ? <p className="mt-0.5 text-[11px] text-text-secondary">{item.subtitle}</p> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12.5px] font-semibold text-text-primary">{valueFormatter(item.value)}</p>
                    {item.secondaryValue ? (
                      <p className="mt-0.5 text-[11px] text-text-secondary">{item.secondaryValue}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className={cn("h-full rounded-full", toneBarClass(item.tone))}
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
