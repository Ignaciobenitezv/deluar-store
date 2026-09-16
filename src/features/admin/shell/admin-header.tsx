import Link from "next/link";
import { DeluarMark, IconCalendar, IconExternal } from "./admin-nav-icons";
import { ThemeToggle } from "./theme-toggle";

export function AdminHeader({ userName, dateLabel }: { userName?: string; dateLabel: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3.5 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 lg:hidden">
        <DeluarMark />
      </div>

      <span className="hidden min-w-0 items-center gap-2 text-[13px] text-text-secondary lg:flex">
        <IconCalendar className="h-[14px] w-[14px] shrink-0" />
        <span className="truncate">{dateLabel}</span>
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          title="Ver tienda"
          aria-label="Ver tienda"
          className="hidden h-8 w-8 items-center justify-center rounded-xl text-text-secondary transition-colors duration-150 hover:bg-surface hover:text-text-primary sm:flex"
        >
          <IconExternal className="h-[15px] w-[15px]" />
        </Link>

        <ThemeToggle />

        {userName ? (
          <div className="ml-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary sm:flex">
            {userName.charAt(0).toUpperCase()}
          </div>
        ) : null}
      </div>
    </header>
  );
}
