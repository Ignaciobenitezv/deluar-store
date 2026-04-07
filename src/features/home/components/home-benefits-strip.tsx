const benefits = [
  {
    id: "shipping",
    title: "Enviamos tu compra",
    text: "Entregas a todo el pais",
    icon: ShippingIcon,
  },
  {
    id: "payment",
    title: "Paga como quieras",
    text: "Tarjetas de credito o efectivo",
    icon: PaymentIcon,
  },
  {
    id: "security",
    title: "Compra con seguridad",
    text: "Tus datos siempre protegidos",
    icon: SecurityIcon,
  },
];

function ShippingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 7.75h10.5v8.5H3.75zm10.5 2h3.2l2.8 2.8v3.7h-6zm-7.5 8a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Zm10 0a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"
      />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3.25" y="6" width="17.5" height="12" rx="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 10.25h16.5M7.25 14.75h3.5" />
    </svg>
  );
}

function SecurityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.75c1.96 1.48 4.46 2.39 7 2.55v5.53c0 4.18-2.55 7.77-7 9.92-4.45-2.15-7-5.74-7-9.92V6.3c2.54-.16 5.04-1.07 7-2.55Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.6 12.25 1.65 1.65 3.3-3.55" />
    </svg>
  );
}

export function HomeBenefitsStrip() {
  return (
    <section className="mb-10 mt-8 px-6 sm:px-8 md:mb-14 md:mt-12 lg:px-12 xl:px-16">
      <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(244,237,228,0.88))] py-6 shadow-[0_18px_44px_rgba(58,40,26,0.045)] md:py-8">
        <div className="grid divide-y divide-border/65 md:grid-cols-3 md:divide-x md:divide-y-0">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                key={benefit.id}
                className="flex items-start gap-6 px-5 py-5 sm:px-6 sm:py-6 md:min-h-[8.75rem] md:gap-10 lg:px-7"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-border/75 bg-white/78 text-[var(--color-accent-strong)] shadow-[0_8px_20px_rgba(58,40,26,0.04)]">
                  <span className="h-5 w-5">
                    <Icon />
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-[1rem] font-semibold tracking-[0.01em] text-foreground sm:text-[1.02rem]">
                    {benefit.title}
                  </h2>
                  <p className="text-sm leading-6 text-muted sm:max-w-[22ch]">{benefit.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
