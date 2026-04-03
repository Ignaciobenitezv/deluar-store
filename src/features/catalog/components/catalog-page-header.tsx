import Link from "next/link";
import type { CatalogCategorySummary } from "@/features/catalog/types";

type CatalogPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  categories: CatalogCategorySummary[];
};

export function CatalogPageHeader({
  eyebrow,
  title,
  description,
  categories,
}: CatalogPageHeaderProps) {
  return (
    <section className="space-y-6 rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.96),rgba(244,237,228,0.92))] px-6 py-10 sm:px-10 sm:py-12">
      <div className="max-w-3xl space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-[0.04em] text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-7 text-muted sm:text-base">{description}</p>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={category.href}
              className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm tracking-[0.05em] text-foreground/80 transition-colors hover:border-foreground/25 hover:text-foreground"
            >
              {category.title}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
