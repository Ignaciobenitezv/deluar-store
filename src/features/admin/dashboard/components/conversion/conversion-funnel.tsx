import type { ConversionFunnelStage } from "@/features/admin/analytics/server/conversion-analytics-service";
import { overviewUi, retentionTone } from "../overview/overview-ui";
import { IconBag, IconCart, IconCheckout, IconProduct, IconSessions } from "./conversion-icons";
import { formatDashboardNumber, formatDashboardPercent } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

/** The reference shows one mark per stage, in the order the journey runs. */
const STAGE_ICON: Record<string, React.ReactNode> = {
  sessions: <IconSessions />,
  "product-viewed": <IconProduct />,
  "add-to-cart": <IconCart />,
  "checkout-started": <IconCheckout />,
  "purchase-completed": <IconBag />,
};

/**
 * Each stage is its own bordered row carrying an icon tile, the stage name, its
 * count, and a bar with the share of sessions beneath — the reference's exact
 * anatomy, drawn from the funnel the service already computes.
 */
export function ConversionFunnel({ stages }: { stages: ConversionFunnelStage[] }) {
  const visible = stages.filter((stage) => stage.key in STAGE_ICON);

  if (visible.length === 0) {
    return (
      <p className={cn(overviewUi.note, "px-5 pb-5")}>
        Sin sesiones registradas en el período.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 px-5 pb-5">
      {visible.map((stage) => {
        const tone = retentionTone(stage.shareOfSessions, stage.count > 0);

        return (
        <div
          key={stage.key}
          className="flex items-center gap-3.5 rounded-xl border border-border bg-surface px-3.5 py-3"
        >
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
          >
            {STAGE_ICON[stage.key]}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] font-medium text-text-primary">
                {stage.label}
              </span>
              <span className="shrink-0 text-[15px] font-semibold tabular-nums tracking-[-0.02em] text-text-primary">
                {formatDashboardNumber(stage.count)}
              </span>
            </span>

            <span className="mt-2 flex items-center gap-3">
              <span aria-hidden className="block h-[7px] min-w-0 flex-1 overflow-hidden rounded-[3px] bg-surface-elevated">
                <span
                  className="block h-full rounded-[3px]"
                  style={{
                    width: `${Math.max(stage.shareOfSessions, stage.count > 0 ? 1.5 : 0)}%`,
                    backgroundColor: tone,
                  }}
                />
              </span>
              <span className="shrink-0 text-[11.5px] tabular-nums text-text-secondary">
                {formatDashboardPercent(stage.shareOfSessions)} del total
              </span>
            </span>
          </span>
        </div>
        );
      })}
    </div>
  );
}
