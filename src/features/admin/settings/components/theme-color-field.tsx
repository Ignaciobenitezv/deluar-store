"use client";

import { useId, useState, type ReactNode } from "react";
import { Input } from "@/components/admin/ui/input";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { normalizeHex } from "@/features/theme/color";
import { cn } from "@/lib/utils";

type ThemeColorFieldProps = {
  label: string;
  description?: string;
  value: string;
  onCommit: (value: string) => void;
  disabled?: boolean;
  /** Extra controls next to the label (e.g. "Fijado" + reset). */
  aside?: ReactNode;
  compact?: boolean;
};

/**
 * Native colour picker + hex box. Free typing in the box; only valid colours
 * reach the draft. Re-synced when the colour changes from outside (picker,
 * preset, reload).
 */
export function ThemeColorField({ label, description, value, onCommit, disabled, aside, compact }: ThemeColorFieldProps) {
  const id = useId();
  const [text, setText] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value);
  }

  const isInvalid = normalizeHex(text) === null;

  return (
    <div className="grid gap-1.5">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={`${id}-hex`} className={compact ? "text-[12px] text-text-primary" : dashboardUi.mutedLabel}>
          {label}
        </label>
        {aside}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label}: selector de color`}
          value={value}
          disabled={disabled}
          onChange={(event) => onCommit(event.target.value)}
          className={cn(
            "shrink-0 cursor-pointer rounded-xl border border-border bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-60 [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0",
            compact ? "h-9 w-10" : "h-[42px] w-12",
          )}
        />
        <Input
          id={`${id}-hex`}
          value={text}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid || description ? `${id}-help` : undefined}
          onChange={(event) => {
            const next = event.target.value.trim();
            setText(next);

            // Commit while typing only once all six digits are in, so "#465"
            // on the way to "#465344" is not taken for #446655.
            if (/^#?[0-9a-f]{6}$/i.test(next)) {
              onCommit(next.startsWith("#") ? next : `#${next}`);
            }
          }}
          onBlur={() => {
            const normalized = normalizeHex(text.startsWith("#") ? text : `#${text}`);

            if (normalized) {
              onCommit(normalized);
            }

            // Leaving the field never strands an invalid value: it shows the colour in use.
            setText(normalized ?? value);
          }}
          className={cn(
            "font-mono uppercase",
            compact ? "py-2 text-[12px]" : "text-[13px]",
            isInvalid && "border-danger/60 focus:border-danger/60 focus:ring-danger/20",
          )}
        />
      </div>
      {isInvalid || description ? (
        <p id={`${id}-help`} className={cn("text-[11px] leading-4", isInvalid ? "text-danger" : "text-text-secondary")}>
          {isInvalid ? "Usá un color hexadecimal, por ejemplo #465344. Al salir del campo vuelve al último color válido." : description}
        </p>
      ) : null}
    </div>
  );
}
