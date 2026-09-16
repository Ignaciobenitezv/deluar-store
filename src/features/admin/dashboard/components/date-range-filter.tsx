"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { dashboardPeriods } from "../lib/dashboard-navigation";
import { cn } from "@/lib/utils";
import type { DashboardPeriodValue } from "../types/dashboard";

const periodValues: DashboardPeriodValue[] = ["today", "7d", "30d", "90d"];

type DateRangeFilterProps = {
  compactMobile?: boolean;
  topBar?: boolean;
};

export function DateRangeFilter({ compactMobile = false, topBar = false }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPeriod = (searchParams.get("period") as DashboardPeriodValue | null) ?? "30d";

  const updatePeriod = (nextPeriod: DashboardPeriodValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPeriod);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (topBar) {
    return (
      <div className="flex items-center gap-0.5 rounded-xl border border-border bg-surface-elevated p-[3px]">
        {periodValues.map((period) => {
          const active = period === currentPeriod;
          return (
            <button
              key={period}
              type="button"
              onClick={() => updatePeriod(period)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11px] font-medium tracking-[-0.01em] transition-colors duration-150",
                active ? "bg-surface text-text-primary shadow-[var(--admin-shadow-sm)]" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {dashboardPeriods[period].label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-20 grid w-full min-w-0 max-w-full grid-cols-2 gap-1 rounded-xl border border-border bg-surface-elevated p-1 sm:flex sm:w-auto sm:flex-wrap sm:justify-end",
        compactMobile && "grid-cols-4 gap-1.5",
      )}
    >
      {periodValues.map((period) => {
        const active = period === currentPeriod;

        return (
          <button
            key={period}
            type="button"
            onClick={() => updatePeriod(period)}
            className={cn(
              "rounded-lg px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150 sm:min-w-[80px] sm:px-3 sm:py-1.5 sm:text-[10.5px] sm:tracking-[0.14em]",
              compactMobile && "h-9 px-1 text-[9.5px] leading-none tracking-[0.1em]",
              active ? "bg-surface text-text-primary shadow-[var(--admin-shadow-sm)]" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {dashboardPeriods[period].label}
          </button>
        );
      })}
    </div>
  );
}
