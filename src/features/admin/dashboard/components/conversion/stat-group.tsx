import { overviewUi } from "../overview/overview-ui";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

/**
 * The reference's inline readings: an outlined mark, the figure beside it, and
 * the label underneath. No boxes around each one.
 */
export function StatGroup({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    // No box around the row: the reference separates the readings with a
    // hairline between them and nothing else.
    <div className={cn("grid px-5 pb-5", className)}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "min-w-0",
            index > 0 && "border-l border-border pl-4",
            index < stats.length - 1 && "pr-4",
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary"
            >
              {stat.icon}
            </span>
            <span className="text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-text-primary">
              {stat.value}
            </span>
          </div>
          <p className="mt-2 truncate text-[11.5px] text-text-secondary">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/** The two tinted readings that close the payment module in the reference. */
export function StatHighlights({
  items,
}: {
  items: { label: string; value: string; icon: React.ReactNode; tone: "positive" | "info" }[];
}) {
  const palette = {
    positive: { surface: "var(--admin-success-soft)", border: "var(--admin-success)", ink: "var(--admin-success)" },
    info: { surface: "var(--admin-info-soft)", border: "var(--admin-info)", ink: "var(--admin-info)" },
  } as const;

  return (
    <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
      {items.map((item) => {
        const tone = palette[item.tone];

        return (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3"
            style={{ backgroundColor: tone.surface, borderColor: `color-mix(in srgb, ${tone.border} 25%, transparent)` }}
          >
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface"
              style={{ color: tone.ink }}
            >
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11.5px] text-text-secondary">{item.label}</span>
              <span className="mt-0.5 block text-[17px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-text-primary">
                {item.value}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ConversionEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-5 mb-5 flex min-h-[110px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background px-5 py-6 text-center">
      <p className="text-[13px] font-medium text-text-primary">{title}</p>
      <p className={cn(overviewUi.note, "mt-1")}>{description}</p>
    </div>
  );
}
