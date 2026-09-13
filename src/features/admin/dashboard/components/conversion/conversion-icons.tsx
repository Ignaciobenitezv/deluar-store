const ICON = {
  viewBox: "0 0 22 22",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSessions({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <circle cx="11" cy="7.5" r="3.2" />
      <path d="M4.5 18c0-3.1 2.9-5.2 6.5-5.2s6.5 2.1 6.5 5.2" />
    </svg>
  );
}

export function IconVisitors({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <circle cx="8.5" cy="8" r="2.8" />
      <path d="M3 17.5c0-2.7 2.5-4.4 5.5-4.4s5.5 1.7 5.5 4.4" />
      <path d="M15 6.2a2.8 2.8 0 0 1 0 5.4M16.5 13.6c1.7.6 2.8 1.9 2.8 3.9" />
    </svg>
  );
}

export function IconCart({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="M3.5 4h2l1.6 8.6h8.9L17.6 7H7" />
      <circle cx="9" cy="17.5" r="1.3" />
      <circle cx="16" cy="17.5" r="1.3" />
    </svg>
  );
}

export function IconRate({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <circle cx="11" cy="11" r="7.5" />
      <path d="M8.4 13.6 13.6 8.4" />
      <circle cx="8.8" cy="9" r="1.1" />
      <circle cx="13.2" cy="13" r="1.1" />
    </svg>
  );
}

export function IconProduct({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="M11 3.5 3.8 7.2v7.6L11 18.5l7.2-3.7V7.2L11 3.5Z" />
      <path d="M3.8 7.2 11 11l7.2-3.8M11 11v7.5" />
    </svg>
  );
}

export function IconCheckout({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <rect x="4" y="6.5" width="14" height="11" rx="2.2" />
      <path d="M8 6.5V5a3 3 0 0 1 6 0v1.5" />
    </svg>
  );
}

export function IconBag({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="M5 7.5h12l-1.2 10H6.2L5 7.5Z" />
      <path d="M8.5 7.5V6a2.5 2.5 0 0 1 5 0v1.5" />
    </svg>
  );
}

export function IconDoc({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="M6 3.5h6.5L17 8v10.5H6V3.5Z" />
      <path d="M12.2 3.6V8H17" />
    </svg>
  );
}

export function IconAlert({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="M11 4.2 19 17.8H3L11 4.2Z" />
      <path d="M11 9.5v3.4M11 15.4h.01" />
    </svg>
  );
}

export function IconClock({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <circle cx="11" cy="11" r="7.5" />
      <path d="M11 6.8V11l2.8 1.8" />
    </svg>
  );
}

export function IconMoney({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="M11 4v14M8 7.5c0-1.1 1.3-1.8 3-1.8s3 .8 3 1.9c0 2.7-6 2.2-6 5.2 0 1.5 1.6 2.1 3 2.1s3-.7 3-2" />
    </svg>
  );
}

export function IconTrend({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="M3.5 17.5V9M8.5 17.5V5.5M13.5 17.5v-5M18.5 17.5V8" />
    </svg>
  );
}
