import type { ButtonHTMLAttributes, ReactNode } from "react";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";

// Pieces shared by the draft → publish editors of Configuración (Apariencia, Textos).

// Not Intl: Node and the browser ship different ICU data (e.g. the space in
// "5:20 p. m."), which breaks hydration. Argentina is UTC-3 all year (no DST).
const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;

export function formatDate(value: string | null | undefined) {
  const time = value ? Date.parse(value) : Number.NaN;

  if (Number.isNaN(time)) {
    return null;
  }

  const date = new Date(time + ARGENTINA_OFFSET_MS);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export type EditorFeedback = { tone: "success" | "warning" | "danger"; message: string; issues?: string[] } | null;

const BUTTON_TONES = {
  primary: dashboardUi.primaryAction,
  soft: dashboardUi.softAction,
  danger:
    "rounded-xl border border-danger/40 bg-danger-soft text-danger transition-colors duration-150 hover:bg-danger/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30",
} as const;

export function ActionButton({
  tone = "soft",
  children,
  ...props
}: { tone?: keyof typeof BUTTON_TONES; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        BUTTON_TONES[tone],
        "inline-flex h-8 items-center justify-center px-3 font-medium disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {/* Size on a span: globals.css sets an unlayered button { font: inherit }. */}
      <span className="text-[12px]">{children}</span>
    </button>
  );
}

export function StatusRow({ label, value, badge }: { label: string; value: ReactNode; badge?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
      <span className={dashboardUi.mutedLabel}>{label}</span>
      <span className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-[12.5px] text-text-primary">
        {value}
        {badge}
      </span>
    </div>
  );
}

export function FeedbackMessage({ feedback }: { feedback: NonNullable<EditorFeedback> }) {
  return (
    <div
      role={feedback.tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-3.5 py-2.5 text-[12px] leading-5",
        feedback.tone === "success" && "border-success/25 bg-success-soft text-success",
        feedback.tone === "warning" && "border-warning/25 bg-warning-soft text-warning",
        feedback.tone === "danger" && "border-danger/25 bg-danger-soft text-danger",
      )}
    >
      {feedback.message}
      {feedback.issues?.length ? <span className="mt-1 block">{feedback.issues.join(" · ")}</span> : null}
    </div>
  );
}
