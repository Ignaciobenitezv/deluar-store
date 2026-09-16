import { cn } from "@/lib/utils";

const svgProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  className: "h-[14px] w-[14px]",
  stroke: "currentColor",
  strokeWidth: "1.6",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Reused verbatim from the previous per-module sidebar's icon set. */
export const adminNavIcons: Record<string, React.ReactNode> = {
  home: (
    <svg {...svgProps}>
      <path d="M2 7.2 8 2l6 5.2v6.3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.2Z" />
      <path d="M6 14V9h4v5" />
    </svg>
  ),
  products: (
    <svg {...svgProps}>
      <path d="M2 5.2 8 2l6 3.2v5.6L8 14 2 10.8V5.2Z" />
      <path d="M2 5.2 8 8.4l6-3.2M8 8.4v5.9" />
    </svg>
  ),
  categories: (
    <svg {...svgProps}>
      <path d="M2 2.8h4.8L8.4 4.6H14v8.6H2V2.8Z" />
    </svg>
  ),
  overview: (
    <svg {...svgProps}>
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  ),
  acquisition: (
    <svg {...svgProps}>
      <path d="M1.5 11 5.5 6.5l2.5 2.5L12.5 4" />
      <path d="M10 4h3v3" />
    </svg>
  ),
  sales: (
    <svg {...svgProps} strokeLinejoin={undefined}>
      <path d="M3 13.5V7M6.5 13.5V4M10 13.5V8.5M13.5 13.5V6" />
    </svg>
  ),
  conversion: (
    <svg {...svgProps}>
      <path d="M2.5 3.5h11l-4 5.5v3.5l-3-1V9l-4-5.5Z" />
    </svg>
  ),
  "abandoned-carts": (
    <svg {...svgProps}>
      <path d="M1.5 2.5H3L4.5 9h7L13 5H5" />
      <circle cx="5.5" cy="12.5" r="1" />
      <circle cx="11" cy="12.5" r="1" />
    </svg>
  ),
  "products-analytics": (
    <svg {...svgProps}>
      <path d="M8 1.5 14.5 5v6L8 14.5 1.5 11V5L8 1.5Z" />
      <path d="M8 1.5v13M1.5 5l6.5 3.5L14.5 5" />
    </svg>
  ),
  customers: (
    <svg {...svgProps}>
      <circle cx="5.5" cy="5" r="2.5" />
      <path d="M1 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <path d="M10.5 3.5c1 .4 1.8 1.4 1.8 2.5s-.8 2.1-1.8 2.5" />
      <path d="M14.5 13.5c0-2-1.5-3.5-3.5-3.5" />
    </svg>
  ),
  checkout: (
    <svg {...svgProps}>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5.5 8l2 2 3-4" />
    </svg>
  ),
  payments: (
    <svg {...svgProps} strokeLinejoin={undefined}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M1.5 6.5h13" />
      <path d="M4 9.5h2.5M9.5 9.5h2.5" />
    </svg>
  ),
  "shipping-analytics": (
    <svg {...svgProps}>
      <path d="M2 5.5h8v6.5H2z" />
      <path d="M10 7.5h2.5L14 10.5v1H10v-4Z" />
      <circle cx="4.5" cy="12.5" r="1.1" />
      <circle cx="12" cy="12.5" r="1.1" />
    </svg>
  ),
  location: (
    <svg {...svgProps}>
      <path d="M8 14S3 9.5 3 6.5a5 5 0 0 1 10 0C13 9.5 8 14 8 14Z" />
      <circle cx="8" cy="6.5" r="1.8" />
    </svg>
  ),
  "products-list": (
    <svg {...svgProps} strokeLinejoin={undefined}>
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M2 7h12M7 2v12" />
    </svg>
  ),
  "orders-list": (
    <svg {...svgProps} strokeLinejoin={undefined}>
      <rect x="3" y="1.5" width="10" height="13" rx="1.5" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
    </svg>
  ),
  "shipments-list": (
    <svg {...svgProps}>
      <path d="M2 5.5h8v6.5H2z" />
      <path d="M10 7.5h2.5L14 10.5v1H10v-4Z" />
      <circle cx="4.5" cy="12.5" r="1.1" />
      <circle cx="12" cy="12.5" r="1.1" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-[14px] w-[14px]">
      <circle cx="3.5" cy="8" r="1.35" />
      <circle cx="8" cy="8" r="1.35" />
      <circle cx="12.5" cy="8" r="1.35" />
    </svg>
  ),
  "settings-general": (
    <svg {...svgProps}>
      <path d="M2.5 13.5V6.8L8 3l5.5 3.8v6.7Z" />
      <path d="M6.2 13.5V9.8h3.6v3.7" />
    </svg>
  ),
  "settings-preferences": (
    <svg {...svgProps}>
      <path d="M2 5h4.6M9.6 5H14M2 11h1.6M6.2 11H14" />
      <circle cx="7.6" cy="5" r="1.4" />
      <circle cx="4.4" cy="11" r="1.4" />
    </svg>
  ),
  "settings-arca": (
    <svg {...svgProps}>
      <path d="M4 2.5h8v11l-1.8-1.2-1.7 1.2-1.8-1.2L5 13.5l-1.8-1.2Z" />
      <path d="M6 6h4M6 8.5h4" />
    </svg>
  ),
  "settings-integrations": (
    <svg {...svgProps}>
      <rect x="1.5" y="4.2" width="5.4" height="5.4" rx="1.2" />
      <rect x="9.1" y="6.4" width="5.4" height="5.4" rx="1.2" />
      <path d="M6.9 7 9.1 9.2" />
    </svg>
  ),
};

export function AdminNavIcon({ itemId, className }: { itemId: string; className?: string }) {
  const icon = adminNavIcons[itemId];
  return <span className={cn("flex shrink-0 items-center justify-center", className)}>{icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>;
}

export function IconSearch({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.7" />
      <path d="m13.5 13.5-2.9-2.9" />
    </svg>
  );
}

export function IconChevronLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3 5 8l5 5" />
    </svg>
  );
}

export function IconChevronRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

export function IconMenu({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  );
}

export function IconClose({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}

export function IconSun({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.3v1.6M8 13.1v1.6M2.6 8H1M15 8h-1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1" />
    </svg>
  );
}

export function IconMoon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 9.3A5.8 5.8 0 0 1 6.7 2.5a5.8 5.8 0 1 0 6.8 6.8Z" />
    </svg>
  );
}

export function IconCalendar({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.2" y="3.2" width="11.6" height="10.6" rx="1.6" />
      <path d="M2.2 6.6h11.6M5.6 1.8v2.4M10.4 1.8v2.4" />
    </svg>
  );
}

export function IconExternal({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5H13.5V6.5" />
      <path d="M13.5 2.5 7.5 8.5" />
      <path d="M12 9.5V12.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5A1 1 0 0 1 3.5 4H6.5" />
    </svg>
  );
}

// Standalone, resizable counterparts of the fixed-14px `adminNavIcons` glyphs
// — that record holds pre-rendered nodes (no className override reaches the
// inner <svg>), which doesn't work for the mobile bottom nav's larger icons.
// Same path data as "home" / "products" / "sales" for visual coherence.
export function IconHome({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7.2 8 2l6 5.2v6.3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.2Z" />
      <path d="M6 14V9h4v5" />
    </svg>
  );
}

export function IconBox({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.2 8 2l6 3.2v5.6L8 14 2 10.8V5.2Z" />
      <path d="M2 5.2 8 8.4l6-3.2M8 8.4v5.9" />
    </svg>
  );
}

export function IconBarChart({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 13.5V7M6.5 13.5V4M10 13.5V8.5M13.5 13.5V6" />
    </svg>
  );
}

// Same glyph as the inline "+" already used by the "Crear producto" button
// (src/app/admin/(shell)/productos/page.tsx) — viewBox 20 and stroke 1.9,
// deliberately not the 16/1.6 convention above, to match that exact icon.
export function IconPlus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}

export function IconGear({ className = "h-[14px] w-[14px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 2.2v1.6M8 12.2v1.6M13.8 8h-1.6M3.8 8H2.2M12.1 3.9l-1.1 1.1M5 11.1l-1.1 1.1M12.1 12.1l-1.1-1.1M5 4.9 3.9 3.9" />
    </svg>
  );
}

export function IconLogout({ className = "h-[14px] w-[14px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2.5H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10.5 11 13.5 8l-3-3M13.5 8H6" />
    </svg>
  );
}

export function DeluarMark() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-primary">
      <svg viewBox="0 0 14 14" fill="none" className="h-[11px] w-[11px]" aria-hidden="true">
        <path d="M7 .5 13.5 4.5v5L7 13.5.5 9.5v-5L7 .5Z" fill="rgba(255,255,255,0.9)" />
        <path d="M7 .5v13M.5 4.5l6.5 4 6.5-4" stroke="rgba(255,255,255,0.25)" strokeWidth=".8" />
      </svg>
    </div>
  );
}
