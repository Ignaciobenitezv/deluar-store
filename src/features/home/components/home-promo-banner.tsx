import Link from "next/link";
import type { HomePromo } from "@/features/home/types";

type HomePromoBannerProps = {
  promo: HomePromo;
};

export function HomePromoBanner({ promo }: HomePromoBannerProps) {
  return (
    <section className="rounded-[2rem] border border-border/80 bg-[linear-gradient(120deg,rgba(246,240,231,0.98),rgba(234,223,207,0.96))] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Promocion</p>
          <h2 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
            {promo.title}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted sm:text-base">
            {promo.text}
          </p>
        </div>

        <div>
          <Link
            href={promo.ctaHref}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-foreground/12 bg-white/75 px-6 text-sm uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/24"
          >
            {promo.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
