/**
 * Plane 0. A cool grey ground with broad, very soft fields of light drifting
 * across it, the way light falls on satin. Drawn rather than photographed, so
 * it carries no subject to compete with the data, stays weightless at any
 * size, and keeps every part of the page light enough for dark text.
 *
 * Its whole job is to give the glass above it something to be seen through.
 */
export function HomeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="bg-ground" x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#eef0f4" />
            <stop offset="38%" stopColor="#e1e4eb" />
            <stop offset="100%" stopColor="#c9ced8" />
          </linearGradient>

          {/* Light falling along a fold: bright at the crest, gone by the trough. */}
          <linearGradient id="bg-lit" x1="0.1" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="48%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="bg-lit-b" x1="0.9" y1="0.1" x2="0.1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="52%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="bg-shade" x1="0.15" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#7e899b" stopOpacity="0.5" />
            <stop offset="64%" stopColor="#98a2b3" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#c2c8d2" stopOpacity="0" />
          </linearGradient>

          {/* The one warm note, barely there, so the grey never goes clinical. */}
          <linearGradient id="bg-warm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8ded2" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#e8ded2" stopOpacity="0" />
          </linearGradient>

          <filter id="bg-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <filter id="bg-blur-tight" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        <rect width="1440" height="900" fill="url(#bg-ground)" />

        {/* The wide crest sweeping down the right side. */}
        <path
          d="M1440 -140 C1150 -20 980 190 1050 400 C1112 588 1330 654 1440 590 Z"
          fill="url(#bg-lit-b)"
          filter="url(#bg-blur)"
        />
        <path
          d="M1440 -60 C1236 46 1108 226 1160 396 C1206 546 1360 596 1440 540 Z"
          fill="url(#bg-shade)"
          filter="url(#bg-blur)"
        />

        {/* A long band of light crossing the whole sheet. */}
        <path
          d="M-140 300 C240 160 560 372 900 288 C1160 224 1330 80 1560 20"
          stroke="url(#bg-lit)"
          strokeWidth="230"
          filter="url(#bg-blur)"
        />
        <path
          d="M-140 214 C230 84 566 296 906 214 C1166 150 1336 12 1560 -48"
          stroke="#9aa3b2"
          strokeOpacity="0.3"
          strokeWidth="90"
          filter="url(#bg-blur)"
        />

        {/* The fold rising from the lower left, so the sheet reads as draped. */}
        <path
          d="M-180 1020 C110 860 250 630 160 452 C92 318 -80 268 -260 300 Z"
          fill="url(#bg-lit)"
          filter="url(#bg-blur)"
        />
        <path
          d="M-200 1040 C60 900 156 690 84 512 C30 380 -120 336 -280 368 Z"
          fill="url(#bg-shade)"
          filter="url(#bg-blur)"
        />

        <path
          d="M-100 760 C280 690 640 856 980 776 C1216 722 1360 630 1560 584"
          stroke="url(#bg-lit-b)"
          strokeWidth="200"
          filter="url(#bg-blur)"
        />

        {/* Two bare creases, the only edges sharp enough to catch the eye. */}
        <path
          d="M-100 348 C250 214 570 420 916 336 C1176 272 1348 128 1560 66"
          stroke="#ffffff"
          strokeOpacity="0.9"
          strokeWidth="2"
          filter="url(#bg-blur-tight)"
        />
        <path
          d="M-100 806 C286 736 646 900 986 820 C1222 766 1366 676 1560 630"
          stroke="#ffffff"
          strokeOpacity="0.72"
          strokeWidth="1.8"
          filter="url(#bg-blur-tight)"
        />

        <ellipse cx="240" cy="806" rx="420" ry="240" fill="url(#bg-warm)" filter="url(#bg-blur)" />
        <ellipse
          cx="700"
          cy="420"
          rx="520"
          ry="250"
          fill="#ffffff"
          fillOpacity="0.5"
          filter="url(#bg-blur)"
        />
      </svg>
    </div>
  );
}
