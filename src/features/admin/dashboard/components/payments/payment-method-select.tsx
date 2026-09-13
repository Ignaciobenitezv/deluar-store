"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The reference's control in the evolution header. It narrows the series to one
 * payment method. With a single method on record there is nothing to choose
 * between, so the control stays in place but inert rather than offering a
 * choice that changes nothing.
 */
export function PaymentMethodSelect({
  options,
  value,
}: {
  options: { value: string; label: string }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      aria-label="Método de pago"
      disabled={options.length <= 2}
      value={value}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("method", event.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="shrink-0 rounded-[6px] border border-[#e2e8f0] bg-white px-3 py-[6px] text-[12.5px] text-slate-700 outline-none transition-colors hover:border-[#cbd5e1] focus:border-[#3b7ff5] focus:ring-2 focus:ring-[#3b7ff5]/15 disabled:cursor-default disabled:text-slate-400"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
