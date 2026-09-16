import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TooltipProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/**
 * CSS-only tooltip (no JS state, no portal) — shows on hover AND keyboard
 * focus via `group-focus-within`, which native `title` cannot do (titles
 * only ever show on mouse hover). Named group (`group/tooltip`) so it never
 * collides with an ancestor's own unnamed `group` (e.g. TabStripContent's
 * `group-hover:` on its parent Link).
 */
export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    // A `div`, not a `span` — a caller may wrap a `<form>` (e.g. the logout
    // button), which is invalid inside inline/phrasing content.
    <div className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium text-text-primary opacity-0 shadow-[var(--admin-shadow-sm)] transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}
