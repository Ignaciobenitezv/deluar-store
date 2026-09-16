import { EmptyState } from "./empty-state";

type LockedMetricCardProps = {
  title: string;
  description: string;
};

export function LockedMetricCard({ title, description }: LockedMetricCardProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <span className="inline-flex rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
          Sin datos
        </span>
      }
    />
  );
}
