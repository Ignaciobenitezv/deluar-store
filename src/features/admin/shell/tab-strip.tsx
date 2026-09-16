"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The presentational half of every tab strip in the admin: a continuous
 * baseline, one sliding active indicator (framer-motion `layoutId`), and
 * icon+label coloring. Deliberately has no opinion on what activates a tab —
 * Analytics wires this to `next/link` + `usePathname()`; the product editor
 * wires it to local `useState`. Keep it that way: this file must stay free
 * of routing so either consumer can use it without dragging the other's
 * behavior in.
 */

export function TabStripBaseline() {
  return <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border" />;
}

export function TabStripIndicator({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-primary"
      transition={{ type: "spring", duration: 0.25, bounce: 0 }}
    />
  );
}

export function TabStripContent({
  active,
  icon,
  label,
  iconClassName = "h-[16px] w-[16px]",
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  iconClassName?: string;
}) {
  return (
    <>
      <span className={cn(iconClassName, active ? "text-primary" : "text-text-secondary group-hover:text-text-primary")}>
        {icon}
      </span>
      <span
        className={cn(
          "text-[13.5px] font-semibold transition-colors duration-150",
          active ? "text-primary" : "text-text-secondary group-hover:text-text-primary",
        )}
      >
        {label}
      </span>
    </>
  );
}
