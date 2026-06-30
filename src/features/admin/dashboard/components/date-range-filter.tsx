"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { dashboardPeriods } from "../lib/dashboard-navigation";
import { cn } from "@/lib/utils";
import type { DashboardPeriodValue } from "../types/dashboard";

const periodValues: DashboardPeriodValue[] = ["today", "7d", "30d", "90d"];

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPeriod = (searchParams.get("period") as DashboardPeriodValue | null) ?? "30d";

  const updatePeriod = (nextPeriod: DashboardPeriodValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPeriod);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-[16px] border border-slate-200 bg-slate-100 p-1 shadow-[0_6px_18px_rgba(15,23,42,0.03)] sm:inline-flex sm:w-auto sm:grid-cols-none sm:rounded-full">
      {periodValues.map((period) => {
        const active = period === currentPeriod;

        return (
          <button
            key={period}
            type="button"
            onClick={() => updatePeriod(period)}
            className={cn(
              "rounded-[12px] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] transition sm:rounded-full sm:px-3.5 sm:py-2 sm:text-[11px] sm:tracking-[0.18em]",
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
