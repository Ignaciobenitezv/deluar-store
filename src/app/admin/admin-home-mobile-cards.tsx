"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);

type MobileTileTone = {
  surface: string;
  icon: string;
  glow: string;
  decor: string;
};

type MobileTileProps = {
  href: string;
  category: string;
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  decorIcon: ReactNode;
  tone: MobileTileTone;
  compact?: boolean;
  featured?: boolean;
};

function ArrowRightIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={cn("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.5 12.5 10 7 15.5" />
    </svg>
  );
}

function DashboardTile({
  href,
  category,
  title,
  value,
  description,
  icon,
  decorIcon,
  tone,
  compact = false,
  featured = false,
}: MobileTileProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <MotionLink
      href={href}
      className={cn(
        "group relative block min-w-0 overflow-hidden border text-slate-900 shadow-[0_12px_26px_rgba(35,45,61,0.08)] backdrop-blur-[16px] transition-[box-shadow,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        featured ? "min-h-[188px] rounded-[28px] p-[17px] min-[390px]:p-[18px]" : compact ? "min-h-[184px] rounded-[28px] p-[17px] min-[390px]:p-[18px]" : "min-h-[186px] rounded-[28px] p-[17px] min-[390px]:p-[18px]",
        tone.surface,
      )}
      initial={false}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -2,
              boxShadow: "0 16px 32px rgba(35, 45, 61, 0.11)",
            }
      }
      whileTap={prefersReducedMotion ? undefined : { scale: 0.985, y: 1 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.22),transparent_28%)]" />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-[-10%] w-24 blur-3xl",
          tone.glow,
        )}
      />
      <div className="pointer-events-none absolute inset-x-[-12%] bottom-[-30%] h-28 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.34),transparent_60%)] blur-3xl opacity-80" />
      <div
        className={cn(
          "pointer-events-none absolute right-[-2%] top-[12%] h-[72%] w-[42%] opacity-[0.07]",
          tone.decor,
        )}
      />
      <div className="pointer-events-none absolute bottom-[-16px] right-[-8px] h-[118px] w-[118px] text-slate-900/50 opacity-[0.1]">
        {decorIcon}
      </div>

      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border shadow-[0_6px_14px_rgba(15,23,42,0.05)] backdrop-blur-md",
              tone.icon,
            )}
          >
            {icon}
          </div>

          <span className="inline-flex items-center gap-1 self-start text-[#314158]/80 transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">{category}</p>
          <h2
            className={cn(
              "mt-1 font-semibold tracking-[-0.045em] text-slate-950",
              featured ? "text-[1.08rem]" : compact ? "text-[1.01rem]" : "text-[1.06rem]",
            )}
          >
            {title}
          </h2>

          <p
            className={cn(
              "mt-2 font-semibold leading-none tracking-[-0.055em] text-slate-950",
              featured ? "text-[1.78rem]" : compact ? "text-[1.56rem]" : "text-[1.62rem]",
            )}
          >
            {value}
          </p>

          <p className="mt-1 text-[12px] leading-5 text-slate-600">{description}</p>
        </div>
      </div>
    </MotionLink>
  );
}

export function MobilePrimaryModuleLink(props: MobileTileProps) {
  return <DashboardTile {...props} featured />;
}

export function MobileSecondaryModuleLink(props: MobileTileProps) {
  return <DashboardTile {...props} compact />;
}
