"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { DEFAULT_IMAGE_FRAMING, IMAGE_FRAMING_MAX_ZOOM, type ImageFraming } from "@/features/storefront-copy/fields";
import { framingStyle } from "@/features/storefront-copy/framing";
import { cn } from "@/lib/utils";
import { ActionButton } from "./settings-editor-ui";

/** The shape the photo is cropped to on each screen (Tailwind aspect classes). */
export type FramingFrames = { desktop: string; mobile: string };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function FramedPhoto({ imageUrl, framing, className }: { imageUrl: string; framing: ImageFraming; className: string }) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-xl border border-border bg-surface-elevated", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- admin preview, any source (CDN, /public) */}
      <img src={imageUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={framingStyle(framing)} />
    </div>
  );
}

/**
 * Pick by hand which part of a photo stays in view and how close: drag (or
 * click) the point to keep, then zoom. Both crops (computer and phone) update
 * live with the very style the store uses. Nothing is saved here: "Aplicar"
 * puts it in the draft, like every other change in Textos.
 */
export function ImageFramingDialog({
  title,
  imageUrl,
  framing,
  frames,
  onApply,
  onClose,
}: {
  title: string;
  imageUrl: string;
  framing: ImageFraming | undefined;
  frames: FramingFrames;
  onApply: (framing: ImageFraming | null) => void;
  onClose: () => void;
}) {
  const [point, setPoint] = useState(framing ?? DEFAULT_IMAGE_FRAMING);
  const [dragging, setDragging] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const pointFrom = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = surfaceRef.current?.getBoundingClientRect();

    if (rect && rect.width > 0 && rect.height > 0) {
      setPoint((current) => ({
        ...current,
        x: clamp01((event.clientX - rect.left) / rect.width),
        y: clamp01((event.clientY - rect.top) / rect.height),
      }));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ajustar encuadre: ${title}`}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-[24px] border border-border bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <p className={dashboardUi.mutedLabel}>Encuadre</p>
            <h3 className="mt-1.5 text-[15px] font-semibold text-text-primary">{title}</h3>
            <p className="mt-1 text-[12.5px] leading-5 text-text-secondary">
              Tocá o arrastrá sobre la foto la parte que tiene que quedar a la vista, y acercá con el zoom si hace falta.
            </p>
          </div>
          <ActionButton onClick={onClose}>Cerrar</ActionButton>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-3">
            <p className="text-[12px] font-medium text-text-primary">Foto completa</p>
            {/* The whole photo, uncropped: the dot is the point that stays in view. */}
            <div
              ref={surfaceRef}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(true);
                pointFrom(event);
              }}
              onPointerMove={(event) => dragging && pointFrom(event)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              className={cn(
                "relative touch-none select-none overflow-hidden rounded-xl border border-border bg-surface-elevated",
                dragging ? "cursor-grabbing" : "cursor-crosshair",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview, any source (CDN, /public) */}
              <img src={imageUrl} alt="" draggable={false} className="pointer-events-none block h-auto w-full" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.55)]"
                style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
              />
            </div>

            <label className="grid gap-1.5">
              <span className="flex items-center justify-between text-[12px] text-text-primary">
                <span className="font-medium">Zoom</span>
                <span className="tabular-nums text-text-secondary">{point.zoom.toFixed(1).replace(".", ",")}×</span>
              </span>
              <input
                type="range"
                min={1}
                max={IMAGE_FRAMING_MAX_ZOOM}
                step={0.05}
                value={point.zoom}
                onChange={(event) => setPoint((current) => ({ ...current, zoom: Number(event.target.value) }))}
                className="w-full accent-[var(--admin-primary,currentColor)]"
              />
            </label>
          </div>

          <div className="grid content-start gap-3">
            <p className="text-[12px] font-medium text-text-primary">Así se ve en la tienda</p>
            <div className="grid gap-1">
              <span className="text-[11px] text-text-secondary">Computadora</span>
              <FramedPhoto imageUrl={imageUrl} framing={point} className={frames.desktop} />
            </div>
            <div className="grid max-w-[11rem] gap-1">
              <span className="text-[11px] text-text-secondary">Celular</span>
              <FramedPhoto imageUrl={imageUrl} framing={point} className={frames.mobile} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 sm:px-6">
          <ActionButton onClick={() => setPoint(DEFAULT_IMAGE_FRAMING)}>Centrar y sin zoom</ActionButton>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={onClose}>Cancelar</ActionButton>
            <ActionButton
              tone="primary"
              onClick={() => {
                onApply(point);
                onClose();
              }}
            >
              Aplicar encuadre
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
