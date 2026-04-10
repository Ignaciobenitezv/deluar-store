import { cn } from "@/lib/utils";

const benefits = [
  {
    id: "shipping",
    title: "Enviamos tu compra",
    text: "Entregas a todo el pais",
  },
  {
    id: "payment",
    title: "Paga como quieras",
    text: "Tarjetas de credito o efectivo",
  },
  {
    id: "security",
    title: "Compra con seguridad",
    text: "Tus datos siempre protegidos",
  },
];

function Track({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div
      aria-hidden={ariaHidden}
      className="flex min-w-max shrink-0 items-center"
    >
      {benefits.map((benefit, index) => (
        <div key={`${benefit.id}-${ariaHidden ? "duplicate" : "main"}`} className="contents">
          <div className="inline-flex items-center whitespace-nowrap">
            <span className="text-[0.9rem] font-medium leading-none tracking-[0.02em] text-foreground sm:text-[0.98rem]">
              {benefit.title}
            </span>
            <span className="ml-4 text-[0.9rem] leading-none text-muted sm:text-[0.98rem]">
              {benefit.text}
            </span>
          </div>

          {index < benefits.length - 1 ? (
            <span className="mx-10 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent-strong)]/72 sm:mx-12 lg:mx-14" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

type HomeBenefitsMarqueeProps = {
  className?: string;
};

export function HomeBenefitsMarquee({ className }: HomeBenefitsMarqueeProps) {
  return (
    <div
      className={cn(
        "overflow-hidden border-t border-[rgba(120,96,76,0.16)] bg-[linear-gradient(180deg,rgba(255,250,244,0.92)_0%,rgba(248,241,232,0.97)_100%)] px-6 py-3 backdrop-blur-[10px] shadow-[0_-14px_28px_rgba(17,12,9,0.08)] sm:px-8 sm:py-4 lg:border-y lg:border-border/70 lg:bg-[linear-gradient(180deg,rgba(255,251,245,0.92),rgba(246,239,231,0.9))] lg:px-10 lg:py-3 lg:backdrop-blur-0 lg:shadow-none",
        className,
      )}
    >
      <div className="home-marquee">
        <Track />
        <Track ariaHidden />
        <Track ariaHidden />
        <Track ariaHidden />
      </div>
    </div>
  );
}
