"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { useAdminProductRevision } from "../context/admin-product-revision-context";
import { updateProductImageHotspotAction } from "../actions/update-product-image-hotspot-action";
import type { AdminImageHotspot } from "../validation/product-images";

// Fixed hotspot footprint we write back — our editor only ever picks a
// focal *point*, never a resizable region, so this stays constant. Small on
// purpose: if this image is ever opened in Sanity Studio directly, it reads
// as a point, not an oversized oval.
const HOTSPOT_SIZE = 0.1;
const DEFAULT_POINT = { x: 0.5, y: 0.5 };

// Same ratio as the catalog card (`aspect-[1.28/1]` in product-card.tsx) —
// the preview here shows exactly the crop Lucila is trying to fix, not an
// arbitrary square.
const PREVIEW_ASPECT_CLASS = "aspect-[1.28/1]";

type AdminProductImageCropEditorProps = {
  open: boolean;
  onClose: () => void;
  productId: string;
  imageKey: string;
  imageUrl: string;
  imageAlt: string;
  hotspot?: AdminImageHotspot;
  onSaved: (hotspot: AdminImageHotspot | undefined) => void;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function pointFromHotspot(hotspot: AdminImageHotspot | undefined) {
  return hotspot ? { x: hotspot.x, y: hotspot.y } : DEFAULT_POINT;
}

export function AdminProductImageCropEditor({
  open,
  onClose,
  productId,
  imageKey,
  imageUrl,
  imageAlt,
  hotspot,
  onSaved,
}: AdminProductImageCropEditorProps) {
  const { currentRev, applyCommit } = useAdminProductRevision();
  const [point, setPoint] = useState(() => pointFromHotspot(hotspot));
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Re-seed from the actual saved hotspot every time the editor opens for a
  // (possibly different) image — never carry over an unsaved drag from a
  // previous open.
  useEffect(() => {
    if (open) {
      setPoint(pointFromHotspot(hotspot));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageKey]);

  const objectPosition = useMemo(() => `${point.x * 100}% ${point.y * 100}%`, [point]);

  const updatePointFromEvent = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = previewRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) {
      return;
    }

    setPoint({
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    updatePointFromEvent(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }

    updatePointFromEvent(event);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);
  };

  const save = async (nextHotspot: AdminImageHotspot | null) => {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const result = await updateProductImageHotspotAction({
        productId,
        rev: currentRev,
        imageKey,
        hotspot: nextHotspot,
      });

      if (result.status === "success") {
        applyCommit({ source: "images", rev: result.rev, updatedAt: result.updatedAt });
        onSaved(result.hotspot ?? undefined);
        onClose();
        return;
      }

      setError(result.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPoint(DEFAULT_POINT);
    void save(null);
  };

  const handleSave = () => {
    void save({
      _type: "sanity.imageHotspot",
      x: point.x,
      y: point.y,
      height: HOTSPOT_SIZE,
      width: HOTSPOT_SIZE,
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#243247]/60 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <p className={dashboardUi.mutedLabel}>Encuadre</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-text-primary">Ajustar encuadre</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Arrastrá la imagen para elegir qué parte queda visible en las cards del catálogo.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>

        <div className="px-5 pt-4 sm:px-6">
          <div
            ref={previewRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            className={cn(
              "relative w-full touch-none select-none overflow-hidden rounded-[20px] border border-border bg-[#f4eadf]",
              isDragging ? "cursor-grabbing" : "cursor-grab",
              PREVIEW_ASPECT_CLASS,
            )}
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              draggable={false}
              sizes="(max-width: 640px) 100vw, 32rem"
              className="pointer-events-none object-cover"
              style={{ objectPosition }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5)]"
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            />
          </div>

          <p className="mt-2 text-center text-xs text-text-secondary">
            Así se ve recortada en una card del catálogo — mové el punto con el mouse o el dedo.
          </p>
        </div>

        {error ? (
          <div
            aria-live="polite"
            className="mx-5 mt-4 rounded-[16px] border border-[var(--admin-danger)]/25 bg-[var(--admin-danger)]/10 px-4 py-3 text-sm text-[color:var(--admin-danger)] sm:mx-6"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            Restablecer
          </button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "rounded-full border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                dashboardUi.primaryAction,
              )}
            >
              {isSaving ? "Guardando..." : "Guardar encuadre"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
