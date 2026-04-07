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
      className="flex min-w-max items-center gap-6 px-6 sm:gap-8 sm:px-8 lg:gap-10 lg:px-10"
    >
      {benefits.map((benefit) => (
        <div
          key={`${benefit.id}-${ariaHidden ? "duplicate" : "main"}`}
          className="inline-flex items-center gap-4 whitespace-nowrap"
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-accent-strong)]/72" />
          <div className="inline-flex items-baseline gap-2 text-[0.9rem] tracking-[0.02em] sm:text-[0.98rem]">
            <span className="font-medium text-foreground">{benefit.title}</span>
            <span className="text-muted">{benefit.text}</span>
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
        "overflow-hidden border-t border-[rgba(120,96,76,0.16)] bg-[linear-gradient(180deg,rgba(255,250,244,0.92)_0%,rgba(248,241,232,0.97)_100%)] py-3 backdrop-blur-[10px] shadow-[0_-14px_28px_rgba(17,12,9,0.08)] sm:py-4 lg:border-y lg:border-border/70 lg:bg-[linear-gradient(180deg,rgba(255,251,245,0.92),rgba(246,239,231,0.9))] lg:backdrop-blur-0 lg:shadow-none",
        className,
      )}
    >
      <div className="home-marquee flex items-center">
        <Track />
        <Track ariaHidden />
      </div>
    </div>
  );
}
