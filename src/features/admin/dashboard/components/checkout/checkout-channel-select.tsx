"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CheckoutFilterOption } from "@/features/admin/analytics/server/checkout-funnel-service";

/**
 * The reference's control in the funnel header. It narrows the cohort to one
 * acquisition channel, read from the session each cart belongs to. With only
 * one channel on record there is nothing to choose between, so the control
 * stays visible but inert rather than offering a choice that does nothing.
 */
export function CheckoutChannelSelect({
  options,
  value,
}: {
  options: CheckoutFilterOption[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const disabled = options.length <= 1;

  return (
    <select
      aria-label="Canal"
      disabled={disabled}
      value={value}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("channel", event.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="shrink-0 rounded-[6px] border border-border bg-surface px-3 py-[6px] text-[12.5px] text-text-primary outline-none transition-colors hover:border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:text-text-secondary"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
