import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * A second boolean primitive, deliberately separate from `Toggle`
 * (components/admin/ui/toggle.tsx) — `Toggle` backs the topbar's
 * ThemeToggle, which is out of scope for any visual change, so this is a
 * distinct component rather than a new variant on it. Same on/off contract,
 * refined per the Warefy reference: an explicit hover state on the track,
 * a slightly larger/more modern proportion, and a snappier ~180ms
 * transition (vs. Toggle's plain 150ms with no hover).
 */
export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary bg-primary hover:brightness-105" : "border-border bg-surface-elevated hover:bg-surface",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 shrink-0 rounded-full bg-white shadow-[var(--admin-shadow-sm)] transition-transform duration-[180ms] ease-out",
          checked ? "translate-x-[22px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
