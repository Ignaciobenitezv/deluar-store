import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Matches the ad-hoc `filterFieldClass` already used for real inputs in
 * orders/page.tsx — same border/bg/focus tokens, formalized here so new
 * forms (Configuración) don't hand-roll another copy. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-text-secondary disabled:placeholder:text-text-secondary/70",
        className,
      )}
      {...props}
    />
  );
});
