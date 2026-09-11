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
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[12px] border border-[#e8e5e1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">{title}</h2>
          {description ? (
            <p className={cn("mt-0.5 text-[12px] text-slate-400", compactMobile && "hidden sm:block")}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="shrink-0 text-[12px] font-medium text-[#9d7d62] transition-colors hover:text-[#7a6249]"
          >
            {action.label} →
          </Link>
        ) : null}
      </div>

      <div className={cn("px-5 py-4", compactMobile && "px-4 py-4 sm:px-5")}>
        {children}
        {emptyState ? emptyState : null}
      </div>
    </section>
  );
}
