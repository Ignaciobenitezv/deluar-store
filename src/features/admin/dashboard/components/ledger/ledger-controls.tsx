"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
] as const;

type LedgerControlsProps = {
  compareEnabled: boolean;
};

/**
 * Period and comparison sit on the page's own ground next to the title, so they
 * read as the toolbar of an analytics view rather than as widgets on a card.
 */
export function LedgerControls({ compareEnabled }: LedgerControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get("period") ?? "30d";

  const push = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    // Any control that changes what the ledger contains sends the reader back
    // to its first page; a stale page number would silently show nothing.
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex items-center gap-3.5">
      <button
        type="button"
        role="switch"
        aria-checked={compareEnabled}
        onClick={() =>
          push((params) => {
            if (compareEnabled) {
              params.set("compare", "0");
            } else {
              params.delete("compare");
            }
          })
        }
        className={cn(
          "flex items-center gap-2 text-[13px] font-medium transition-colors",
          compareEnabled ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex h-[18px] w-[30px] items-center rounded-full px-[2px] transition-colors duration-200",
            compareEnabled ? "bg-primary" : "bg-text-secondary/40",
          )}
        >
          <span
            className={cn(
              "h-[14px] w-[14px] rounded-full bg-surface transition-transform duration-200 ease-out",
              compareEnabled && "translate-x-[12px]",
            )}
          />
        </span>
        Comparar
      </button>

      <div
        className="flex items-center gap-1 rounded-[7px] border border-border bg-surface p-[3px]"
        role="group"
        aria-label="Período"
      >
        {PERIODS.map((period) => {
          const active = period.value === currentPeriod;

          return (
            <button
              key={period.value}
              type="button"
              onClick={() => push((params) => params.set("period", period.value))}
              aria-pressed={active}
              className={cn(
                "rounded-[5px] px-3.5 py-[7px] text-[13px] font-medium transition-colors",
                active
                  ? "bg-primary text-white"
                  : "text-text-primary hover:bg-background hover:text-text-primary",
              )}
            >
              {period.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
