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
      <div className="flex items-center gap-0.5 rounded-full border border-slate-200/70 bg-slate-100/70 p-[3px]">
        {periodValues.map((period) => {
          const active = period === currentPeriod;
          return (
            <button
              key={period}
              type="button"
              onClick={() => updatePeriod(period)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[-0.01em] transition",
                active
                  ? "bg-white text-slate-950 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                  : "text-slate-500 hover:text-slate-800",
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
        "relative z-20 grid w-full min-w-0 max-w-full grid-cols-2 gap-1 rounded-[16px] border border-slate-200 bg-slate-100 p-1 shadow-[0_6px_18px_rgba(15,23,42,0.03)] sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:rounded-full",
        compactMobile && "grid-cols-4 gap-1.5 rounded-[18px] border-slate-200/70 bg-slate-100/80 shadow-none",
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
              "rounded-[12px] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] transition sm:min-w-[88px] sm:rounded-full sm:px-3.5 sm:py-2 sm:text-[11px] sm:tracking-[0.18em]",
              compactMobile && "h-10 px-1 text-[10px] leading-none tracking-[0.12em]",
              active
                ? "bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {dashboardPeriods[period].label}
          </button>
        );
      })}
    </div>
  );
}
