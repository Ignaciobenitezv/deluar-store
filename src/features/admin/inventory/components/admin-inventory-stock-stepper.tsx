"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type AdminInventoryStockStepperProps = {
  value: number;
  disabled?: boolean;
  onChange: (nextValue: number) => void;
  size?: "sm" | "md";
};

function normalizeStock(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

/** The `[-] [N] [+]` control — the primary action of an Inventario row.
 * Never writes anywhere itself; `onChange` only updates local state one
 * level up (the pending-changes context). Typing directly into the number
 * is the third way to change it, alongside the two buttons. */
export function AdminInventoryStockStepper({ value, disabled, onChange, size = "md" }: AdminInventoryStockStepperProps) {
  const [draftText, setDraftText] = useState<string | null>(null);

  const buttonClass = cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary transition-colors duration-150 hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40",
    size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-base",
  );

  const inputClass = cn(
    "shrink-0 rounded-lg border border-border bg-surface text-center font-semibold tabular-nums text-text-primary outline-none transition-colors focus:border-primary/50",
    size === "sm" ? "h-8 w-12 text-sm" : "h-9 w-14 text-[15px]",
  );

  const commit = (next: number) => {
    setDraftText(null);
    onChange(normalizeStock(next));
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Restar una unidad"
        disabled={disabled || value <= 0}
        onClick={() => commit(value - 1)}
        className={buttonClass}
      >
        −
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        aria-label="Stock"
        disabled={disabled}
        value={draftText ?? String(value)}
        onChange={(event) => setDraftText(event.target.value)}
        onBlur={() => {
          if (draftText === null) return;
          const parsed = Number.parseInt(draftText, 10);
          commit(Number.isFinite(parsed) ? parsed : value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={inputClass}
      />

      <button
        type="button"
        aria-label="Sumar una unidad"
        disabled={disabled}
        onClick={() => commit(value + 1)}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}
