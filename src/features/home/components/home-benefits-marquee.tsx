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
      className="flex min-w-max shrink-0 items-center gap-10 pr-10 sm:gap-12 sm:pr-12 lg:gap-14 lg:pr-14"
    >
      {benefits.map((benefit) => (
        <div
          key={`${benefit.id}-${ariaHidden ? "duplicate" : "main"}`}
          className="inline-flex items-center gap-6 whitespace-nowrap"
        >
          <span className="inline-flex h-2 w-2 shrink-0 translate-y-[2px] rounded-full bg-[var(--color-accent-strong)]/72" />
          <div className="inline-flex items-center gap-4 whitespace-nowrap text-[0.9rem] leading-none tracking-[0.02em] sm:text-[0.98rem]">
            <span className="font-medium leading-none text-foreground">{benefit.title}</span>
            <span className="leading-none text-muted">{benefit.text}</span>
          </div>
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
