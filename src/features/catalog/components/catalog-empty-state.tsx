type CatalogEmptyStateProps = {
  title: string;
  description: string;
};

export function CatalogEmptyState({
  title,
  description,
}: CatalogEmptyStateProps) {
  return (
    <div className="rounded-[1.75rem] border border-border/80 bg-surface/85 px-6 py-14 text-center sm:px-10">
      <div className="mx-auto max-w-xl space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">
          Catalogo en preparacion
        </p>
        <h2 className="text-2xl font-semibold tracking-[0.04em] text-foreground">
          {title}
        </h2>
        <p className="text-sm leading-7 text-muted sm:text-base">{description}</p>
      </div>
    </div>
  );
}
