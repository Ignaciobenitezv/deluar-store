import { cn } from "@/lib/utils";
import type {
  OrderStatusInput,
  OrderTimelineOptions,
  OrderTimelineStepState,
} from "@/features/order/status";
import { buildOrderTimeline } from "@/features/order/status";

type OrderTimelineProps = {
  status: OrderStatusInput;
  paymentMethod?: OrderTimelineOptions["paymentMethod"];
  paymentStatus?: OrderTimelineOptions["paymentStatus"];
  className?: string;
};

const stepStateClasses: Record<
  OrderTimelineStepState,
  {
    dot: string;
    line: string;
    label: string;
    helper: string;
  }
> = {
  complete: {
    dot: "border-[var(--color-accent-strong)]/25 bg-[rgba(182,146,114,0.16)] text-[var(--color-accent-strong)]",
    line: "bg-[rgba(182,146,114,0.45)]",
    label: "text-foreground",
    helper: "Completado",
  },
  current: {
    dot: "border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white shadow-[0_8px_20px_rgba(96,71,56,0.2)]",
    line: "bg-border",
    label: "text-[var(--color-accent-strong)]",
    helper: "Actual",
  },
  pending: {
    dot: "border-border/80 bg-[#f1e9df] text-[#9a8a7b]",
    line: "bg-border",
    label: "text-muted/75",
    helper: "Pendiente",
  },
};

function getTerminalClasses(tone: "neutral" | "progress" | "success" | "warning" | "danger") {
  switch (tone) {
    case "danger":
      return "border-red-700/15 bg-red-50/70 text-red-900";
    case "warning":
      return "border-amber-700/15 bg-amber-50/75 text-amber-900";
    case "success":
      return "border-emerald-700/15 bg-emerald-50/75 text-emerald-900";
    case "progress":
      return "border-[var(--color-accent-strong)]/20 bg-[rgba(182,146,114,0.11)] text-foreground";
    case "neutral":
    default:
      return "border-border bg-background/70 text-foreground";
  }
}

export function OrderTimeline({
  status,
  paymentMethod,
  paymentStatus,
  className,
}: OrderTimelineProps) {
  const timeline = buildOrderTimeline(status, {
    paymentMethod,
    paymentStatus,
  });

  return (
    <section
      aria-label="Estado del pedido"
      className={cn(
        "mx-auto max-w-[21rem] rounded-[1.25rem] border border-border/75 bg-white/65 p-4 shadow-[0_14px_34px_rgba(58,40,26,0.04)] sm:max-w-none sm:rounded-[1.4rem] sm:p-5 sm:shadow-[0_16px_40px_rgba(58,40,26,0.04)]",
        className,
      )}
    >
      {timeline.kind === "terminal" ? (
        <div
          className={cn(
            "mb-5 rounded-[1rem] border px-4 py-3",
            getTerminalClasses(timeline.tone),
          )}
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em]">
            {timeline.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">{timeline.description}</p>
        </div>
      ) : null}

      <ol className="grid gap-0 sm:grid-cols-4 sm:gap-3">
        {timeline.steps.map((step, index) => {
          const stateClasses = stepStateClasses[step.state];
          const isLast = index === timeline.steps.length - 1;

          return (
            <li
              key={step.id}
              className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2.5 pb-5 last:pb-0 sm:grid-cols-1 sm:gap-2 sm:pb-0"
            >
              <div className="relative flex justify-center sm:justify-start">
                <span
                  className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[0.68rem] font-semibold sm:h-8 sm:w-8 sm:text-xs",
                    stateClasses.dot,
                  )}
                >
                  {index + 1}
                </span>
                {!isLast ? (
                  <span
                    className={cn(
                      "absolute left-1/2 top-7 h-[calc(100%-0.125rem)] w-px -translate-x-1/2 sm:left-8 sm:top-1/2 sm:h-px sm:w-[calc(100%-1.5rem)] sm:translate-x-0 sm:-translate-y-1/2",
                      stateClasses.line,
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <div className="min-w-0 sm:pt-2">
                <p className={cn("text-sm font-medium leading-5", stateClasses.label)}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.13em] text-muted sm:mt-1 sm:text-xs sm:tracking-[0.14em]">
                  {stateClasses.helper}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
