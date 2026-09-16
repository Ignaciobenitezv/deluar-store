import Link from "next/link";
import { cn } from "@/lib/utils";

type ChartCardProps = {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
  compactMobile?: boolean;
};

export function ChartCard({
  title,
  description,
  action,
  children,
  emptyState,
  className,
  compactMobile = false,
}: ChartCardProps) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-2xl border border-border bg-surface", className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h2>
          {description ? (
            <p className={cn("mt-0.5 text-[11.5px] text-text-secondary", compactMobile && "hidden sm:block")}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <Link href={action.href} className="shrink-0 text-[12px] font-medium text-primary transition-colors hover:underline underline-offset-[3px]">
            {action.label} →
          </Link>
        ) : null}
      </div>

      <div className={cn("px-4 py-4", compactMobile && "px-3.5 py-3.5 sm:px-4")}>
        {children}
        {emptyState ? emptyState : null}
      </div>
    </section>
  );
}
