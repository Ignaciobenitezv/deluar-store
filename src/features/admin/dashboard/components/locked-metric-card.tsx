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
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Disponible al activar tracking avanzado
        </span>
      }
    />
  );
}

