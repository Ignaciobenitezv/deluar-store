import { displaySerif } from "./home-fonts";
import { cn } from "@/lib/utils";

function IconSearch({ className = "h-[17px] w-[17px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
    >
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m15.8 15.8 4 4" />
    </svg>
  );
}

function IconChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}

/**
 * The bar above the shell. The field searches orders, which is the one dataset
 * the Admin can actually search by free text, so the placeholder promises only
 * that.
 */
export function HomeTopbar({ displayName }: { displayName: string }) {
  const initial = (displayName || "A").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-6 px-1 pb-4 pt-1">
      <form
        action="/admin/orders"
        method="get"
        className="group flex h-[42px] min-w-0 max-w-[520px] flex-1 items-center gap-2.5 rounded-full border border-white/80 bg-white/70 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md transition-colors focus-within:border-[#3b7ff5]/40 focus-within:bg-white/90"
      >
        <span aria-hidden className="shrink-0 text-slate-400">
          <IconSearch />
        </span>
        <input
          type="search"
          name="q"
          placeholder="Buscar órdenes por número, cliente o email…"
          aria-label="Buscar órdenes"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400"
        />
        <kbd className="hidden shrink-0 rounded-[5px] border border-slate-200/80 bg-white/70 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500 sm:block">
          ⌘K
        </kbd>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            displaySerif.className,
            "flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/75 text-[15px] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-md",
          )}
        >
          {initial}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-medium leading-tight text-slate-900">
            {displayName || "Administración"}
          </span>
          <span className="block truncate text-[12px] leading-tight text-slate-600">
            Administradora
          </span>
        </span>
        <IconChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </div>
    </div>
  );
}
