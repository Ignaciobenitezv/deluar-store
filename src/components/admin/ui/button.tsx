import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-[13px] font-medium tracking-[-0.01em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-primary bg-primary text-primary-foreground shadow-[var(--admin-shadow-sm)] hover:brightness-105 active:brightness-95",
  secondary:
    "border-border bg-surface text-text-primary shadow-[var(--admin-shadow-sm)] hover:bg-surface-elevated active:bg-background",
  ghost: "border-transparent bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
  danger: "border-danger/25 bg-danger-soft text-danger hover:border-danger/40 hover:brightness-95",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[12px]",
  md: "h-9 px-3.5",
  icon: "h-9 w-9 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});
