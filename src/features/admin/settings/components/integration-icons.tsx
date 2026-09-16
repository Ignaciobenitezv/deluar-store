const svgProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  className: "h-4 w-4",
  stroke: "currentColor",
  strokeWidth: "1.6",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * Generic category glyphs, not brand logos — reproducing an unverified
 * "official" mark for Sanity/Resend/MercadoPago/etc. would be worse than a
 * plain, honest category icon in the admin's own monoline style.
 */
export const integrationIcons: Record<string, React.ReactNode> = {
  sanity: (
    <svg {...svgProps}>
      <rect x="2" y="2.5" width="12" height="3" rx="1" />
      <rect x="2" y="6.8" width="8" height="3" rx="1" />
      <rect x="2" y="11.1" width="10" height="3" rx="1" />
    </svg>
  ),
  resend: (
    <svg {...svgProps}>
      <rect x="1.7" y="3.5" width="12.6" height="9" rx="1.5" />
      <path d="M2.2 4.3 8 8.5l5.8-4.2" />
    </svg>
  ),
  mercadopago: (
    <svg {...svgProps}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M1.5 6.5h13" />
    </svg>
  ),
  gocuotas: (
    <svg {...svgProps}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M1.5 6.5h13" />
      <path d="M6.2 9.7h3.6" />
    </svg>
  ),
  unicobros: (
    <svg {...svgProps}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M1.5 6.5h13" />
      <path d="M5.2 9.8 6.7 11l3.1-3.3" />
    </svg>
  ),
};
