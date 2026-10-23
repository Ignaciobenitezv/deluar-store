"use client";

import { useEffect, useState, type JSX } from "react";
import type { StorefrontCopy } from "@/features/storefront-copy/fields";

type Benefit = { id: string; title: string; text: string; icon: () => JSX.Element };

// Texts from Configuración → Textos; the icons stay with their position.
function buildBenefits(copy: StorefrontCopy["benefits"]): Benefit[] {
  return [
    { id: "shipping", title: copy.shippingTitle, text: copy.shippingText, icon: ShippingIcon },
    { id: "payment", title: copy.paymentTitle, text: copy.paymentText, icon: PaymentIcon },
    { id: "installments", title: copy.installmentsTitle, text: copy.installmentsText, icon: InstallmentsIcon },
  ];
}

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
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.25 7.5h11.5M7 12h10M7.75 16.5h8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.75v12.5" />
    </svg>
  );
}

function InstallmentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3.25" y="5.75" width="17.5" height="12.5" rx="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10.25h10M7.5 14.25h4.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.5 16 1.4 1.4 2.85-2.9" />
    </svg>
  );
}

function BenefitItem({ benefit }: { benefit: Benefit }) {
  const Icon = benefit.icon;

  return (
    <article className="flex flex-col items-center text-center">
      <div className="flex h-10 w-10 items-center justify-center text-foreground/78">
        <span className="h-5 w-5">
          <Icon />
        </span>
      </div>
      <h2 className="mt-4 text-[1.05rem] font-semibold tracking-[0.01em] text-foreground">
        {benefit.title}
      </h2>
      <p className="mt-2 max-w-[18rem] text-[0.88rem] leading-6 text-muted">
        {benefit.text}
      </p>
    </article>
  );
}

export function HomeBenefitsStrip({ copy }: { copy: StorefrontCopy["benefits"] }) {
  const benefits = buildBenefits(copy);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeBenefit = benefits[activeIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % benefits.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [benefits.length]);

  return (
    <section className="bg-surface-raised py-14 sm:py-16">
      <div className="mx-auto w-full max-w-[78rem] px-6 sm:px-8 lg:px-10">
        <div className="md:hidden">
          <div
            key={activeBenefit.id}
            className="animate-[fade-up_420ms_cubic-bezier(0.16,1,0.3,1)]"
          >
            <BenefitItem benefit={activeBenefit} />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            {benefits.map((benefit, index) => (
              <span
                key={benefit.id}
                className={
                  index === activeIndex
                    ? "h-1.5 w-6 rounded-full bg-brand transition-all duration-300"
                    : "h-1.5 w-1.5 rounded-full bg-border transition-all duration-300"
                }
              />
            ))}
          </div>
        </div>

        <div className="hidden gap-12 md:grid md:grid-cols-3 md:gap-10 lg:gap-14">
          {benefits.map((benefit) => (
            <BenefitItem key={benefit.id} benefit={benefit} />
          ))}
        </div>
      </div>
    </section>
  );
}
