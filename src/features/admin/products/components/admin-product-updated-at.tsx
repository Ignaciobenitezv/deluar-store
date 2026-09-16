"use client";

import { formatDashboardDateTime } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { useAdminProductRevision } from "../context/admin-product-revision-context";

type AdminProductUpdatedAtProps = {
  initialUpdatedAt: string;
  variant: "badge" | "field";
};

export function AdminProductUpdatedAt({ initialUpdatedAt, variant }: AdminProductUpdatedAtProps) {
  const formatted = formatDashboardDateTime(initialUpdatedAt);

  if (variant === "field") {
    return (
      <div className="flex items-center justify-between gap-4">
        <dt>Actualizado</dt>
        <dd className="font-medium text-text-primary">{formatted}</dd>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-border bg-surface-elevated px-4 py-3 text-xs text-text-secondary">
      <p className="uppercase tracking-[0.18em]">Última actualización</p>
      <p className="mt-1 font-medium text-text-primary">{formatted}</p>
    </div>
  );
}

export function AdminProductDetailUpdatedAt({ initialUpdatedAt, variant }: AdminProductUpdatedAtProps) {
  const revision = useAdminProductRevision();
  const formatted = formatDashboardDateTime(revision.updatedAt ?? initialUpdatedAt);

  if (variant === "field") {
    return (
      <div className="flex items-center justify-between gap-4">
        <dt>Actualizado</dt>
        <dd className="font-medium text-text-primary">{formatted}</dd>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-border bg-surface-elevated px-4 py-3 text-xs text-text-secondary">
      <p className="uppercase tracking-[0.18em]">Última actualización</p>
      <p className="mt-1 font-medium text-text-primary">{formatted}</p>
    </div>
  );
}
