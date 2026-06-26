import { cn } from "@/lib/utils";
import type { OrderStatusInput } from "@/features/order/status";
import {
  getOrderStatusBadgeClasses,
  getOrderStatusLabel,
} from "@/features/order/status";

type OrderStatusBadgeProps = {
  status: OrderStatusInput;
  className?: string;
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]",
        getOrderStatusBadgeClasses(status),
        className,
      )}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}
