const ICON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Line icons only, at one weight — a module is named by its label, not drawn. */

export function IconProducts({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <path d="M12 2.8 3.6 7.2v9.6L12 21.2l8.4-4.4V7.2L12 2.8Z" />
      <path d="M3.6 7.2 12 11.6l8.4-4.4M12 11.6v9.6" />
    </svg>
  );
}

export function IconSales({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <path d="M2.8 3.2h2.4l2.1 10.4h9.9l1.9-7.4H6.6" />
      <circle cx="9.2" cy="19.2" r="1.6" />
      <circle cx="17.2" cy="19.2" r="1.6" />
    </svg>
  );
}

export function IconOrders({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <path d="M6.4 2.8h11.2A1.6 1.6 0 0 1 19.2 4.4v15.2a1.6 1.6 0 0 1-1.6 1.6H6.4a1.6 1.6 0 0 1-1.6-1.6V4.4a1.6 1.6 0 0 1 1.6-1.6Z" />
      <path d="M8.4 7.6h7.2M8.4 12h7.2M8.4 16.4h4.4" />
    </svg>
  );
}

export function IconStats({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <path d="M3.6 20.4V3.6M3.6 20.4h16.8" />
      <path d="M7.2 16.4l3.6-4.4 3.2 2.4 5.2-7.6" />
    </svg>
  );
}

export function IconShipping({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <path d="M2.8 6.4h10.4v9.2H2.8zM13.2 9.6h3.6l2.8 2.8v3.2h-6.4z" />
      <circle cx="7.2" cy="18" r="1.8" />
      <circle cx="16.4" cy="18" r="1.8" />
    </svg>
  );
}

export function IconCustomers({ className = "h-[19px] w-[19px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <circle cx="9.2" cy="8.4" r="3.2" />
      <path d="M3.2 19.2c0-3.1 2.8-5 6-5s6 1.9 6 5" />
      <path d="M16.4 6.2a3.2 3.2 0 0 1 0 6.2M18.2 14.6c2 .7 3.2 2.2 3.2 4.6" />
    </svg>
  );
}

export function IconChevron({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 20 20" className={className} strokeWidth={1.8}>
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

export function IconArrow({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 20 20" className={className} strokeWidth={1.8}>
      <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
    </svg>
  );
}

export function IconClock({ className = "h-[17px] w-[17px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 6.8V12l3.6 2.2" />
    </svg>
  );
}

export function IconBolt({ className = "h-[17px] w-[17px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <path d="M13.2 2.8 4.8 13.6h6L10 21.2l8.4-10.8h-6l.8-7.6Z" />
    </svg>
  );
}

export function IconCalendar({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2" />
      <path d="M3.6 10h16.8M8 3.6v3.2M16 3.6v3.2" />
    </svg>
  );
}

export function IconStock({ className = "h-[17px] w-[17px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <ellipse cx="12" cy="6" rx="7.6" ry="3.2" />
      <path d="M4.4 6v12c0 1.8 3.4 3.2 7.6 3.2s7.6-1.4 7.6-3.2V6M4.4 12c0 1.8 3.4 3.2 7.6 3.2s7.6-1.4 7.6-3.2" />
    </svg>
  );
}

export function IconPlus({ className = "h-[17px] w-[17px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className} strokeWidth={1.8}>
      <path d="M12 5.2v13.6M5.2 12h13.6" />
    </svg>
  );
}

export function IconTag({ className = "h-[17px] w-[17px]" }: { className?: string }) {
  return (
    <svg {...ICON} viewBox="0 0 24 24" className={className}>
      <path d="M11.2 3.2H4.4a1.2 1.2 0 0 0-1.2 1.2v6.8c0 .3.1.6.35.85l8.4 8.4a1.2 1.2 0 0 0 1.7 0l6.8-6.8a1.2 1.2 0 0 0 0-1.7l-8.4-8.4a1.2 1.2 0 0 0-.85-.35Z" />
      <circle cx="7.6" cy="7.6" r="1.3" />
    </svg>
  );
}
