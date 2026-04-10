"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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

function BenefitCard({
  benefit,
  centered = false,
}: {
  benefit: (typeof benefits)[number];
  centered?: boolean;
}) {
  const Icon = benefit.icon;

  return (
    <article
      className={cn(
        "flex gap-4",
        centered ? "flex-col items-center text-center" : "items-start",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/58 text-[var(--color-accent-strong)] sm:h-11 sm:w-11">
        <span className="h-4.5 w-4.5 sm:h-5 sm:w-5">
          <Icon />
        </span>
      </div>

      <div className={cn("space-y-1.5", centered && "max-w-[18rem]")}>
        <h2 className="text-[1rem] font-semibold tracking-[0.015em] text-foreground sm:text-[1.04rem] lg:text-[1.08rem]">
          {benefit.title}
        </h2>
        <p className="text-[0.9rem] leading-6 text-muted sm:text-[0.95rem] lg:max-w-[24ch]">
          {benefit.text}
        </p>
      </div>
    </article>
  );
}

export function HomeBenefitsStrip() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="pb-10 pt-7 sm:pb-12 sm:pt-8">
      <div className="w-full bg-[linear-gradient(180deg,rgba(255,252,247,0.7),rgba(244,237,228,0.46))]">
        <div className="lg:hidden">
          <div className="overflow-hidden py-6 sm:py-7">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {benefits.map((benefit) => (
                <div key={benefit.id} className="w-full shrink-0 px-2">
                  <div className="mx-auto flex min-h-[9.75rem] max-w-[20rem] items-center justify-center px-3">
                    <BenefitCard benefit={benefit} centered />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pb-4">
            {benefits.map((benefit, index) => (
              <button
                key={benefit.id}
                type="button"
                aria-label={`Ver beneficio ${index + 1}`}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === activeIndex
                    ? "w-5 bg-[var(--color-accent-strong)]"
                    : "w-2 bg-border/80 hover:bg-border",
                )}
              />
            ))}
          </div>
        </div>

        <div className="hidden lg:grid lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <article
              key={benefit.id}
              className={cn(
                "min-h-[10.5rem] px-10 py-10",
                index < benefits.length - 1 && "border-r border-border/45",
              )}
            >
              <BenefitCard benefit={benefit} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
