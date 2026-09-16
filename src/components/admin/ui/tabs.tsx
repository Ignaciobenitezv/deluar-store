"use client";

import { cn } from "@/lib/utils";

export type TabOption = {
  value: string;
  label: string;
};

type TabsProps = {
  options: TabOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export function Tabs({ options, value, onValueChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface-elevated p-[3px]",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12px] font-medium tracking-[-0.01em] transition-colors duration-150",
              active ? "bg-surface text-text-primary shadow-[var(--admin-shadow-sm)]" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
