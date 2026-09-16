"use client";

import { useState, useTransition, useRef } from "react";
import { cn } from "@/lib/utils";
import { markTransferOrderPaidAction } from "@/app/admin/(shell)/orders/actions";

type Size = "sm" | "md";
type Stage = "idle" | "confirm" | "loading" | "done" | "error";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="m4.75 10.25 3.05 3.05L15.25 5.85"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={cn("animate-spin", className)}
    >
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M10 3a7 7 0 0 1 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MarkOrderPaidButton({
  orderId,
  size = "md",
}: {
  orderId: string;
  size?: Size;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const idleButtonRef = useRef<HTMLButtonElement>(null);
  const firstConfirmButtonRef = useRef<HTMLButtonElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);

  const isSm = size === "sm";
  const icon = isSm ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0";

  const greenBtn = cn(
    "inline-flex items-center justify-center gap-1.5 border font-semibold whitespace-nowrap transition-colors duration-150",
    "border-success bg-success text-white",
    "hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35",
    "disabled:pointer-events-none disabled:opacity-60",
    isSm ? "h-9 rounded-xl px-3 text-[12px]" : "w-full rounded-xl px-3.5 py-2.5 text-[13px]",
  );

  const ghostBtn = cn(
    "inline-flex items-center justify-center gap-1.5 border font-semibold whitespace-nowrap transition-colors duration-150",
    "border-border bg-surface text-text-primary",
    "hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
    isSm ? "h-9 rounded-xl px-3 text-[12px]" : "w-full rounded-xl px-3.5 py-2.5 text-[13px]",
  );

  function handleConfirm() {
    setStage("confirm");
    requestAnimationFrame(() => firstConfirmButtonRef.current?.focus());
  }

  function handleCancel() {
    setStage("idle");
    requestAnimationFrame(() => idleButtonRef.current?.focus());
  }

  function handleSubmit() {
    setStage("loading");
    const fd = new FormData();
    fd.set("orderId", orderId);
    startTransition(async () => {
      try {
        const result = await markTransferOrderPaidAction(fd);
        if (result.ok) {
          setStage("done");
        } else {
          setErrorMessages(result.errors);
          setStage("error");
          requestAnimationFrame(() => retryButtonRef.current?.focus());
        }
      } catch {
        setErrorMessages(["No se pudo guardar. Intentá de nuevo."]);
        setStage("error");
        requestAnimationFrame(() => retryButtonRef.current?.focus());
      }
    });
  }

  if (stage === "idle") {
    return (
      <button ref={idleButtonRef} type="button" onClick={handleConfirm} className={greenBtn}>
        <CheckIcon className={icon} />
        Marcar como pagada
      </button>
    );
  }

  if (stage === "confirm") {
    if (isSm) {
      return (
        <div className="flex gap-2">
          <button ref={firstConfirmButtonRef} type="button" onClick={handleCancel} className={ghostBtn}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} className={greenBtn}>
            <CheckIcon className={icon} />
            Confirmar pago
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <button ref={firstConfirmButtonRef} type="button" onClick={handleSubmit} className={greenBtn}>
          <CheckIcon className={icon} />
          Confirmar pago
        </button>
        <button type="button" onClick={handleCancel} className={ghostBtn}>
          Cancelar
        </button>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <button type="button" disabled className={greenBtn}>
        <SpinnerIcon className={icon} />
        Procesando…
      </button>
    );
  }

  if (stage === "done") {
    return (
      <div
        role="status"
        className={cn(
          "inline-flex items-center justify-center gap-1.5 border border-success/25 bg-success-soft font-semibold text-success",
          isSm ? "h-9 rounded-xl px-3 text-[12px]" : "w-full rounded-xl px-3.5 py-2.5 text-[13px]",
        )}
      >
        <CheckIcon className={icon} />
        Orden pagada
      </div>
    );
  }

  // error
  const errorLabel = errorMessages.length > 0 ? errorMessages[0] : "No se pudo guardar. Intentá de nuevo.";

  if (isSm) {
    return (
      <div role="alert">
        <button
          ref={retryButtonRef}
          type="button"
          onClick={() => { setErrorMessages([]); setStage("idle"); }}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-danger/25 bg-danger-soft px-3 text-[12px] font-semibold text-danger transition-colors duration-150 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
        >
          Error — Reintentar
        </button>
      </div>
    );
  }

  return (
    <div role="alert" className="flex flex-col gap-2">
      <p className="w-full rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-center text-[12px] font-semibold text-danger">
        {errorLabel}
      </p>
      <button
        ref={retryButtonRef}
        type="button"
        onClick={() => { setErrorMessages([]); setStage("idle"); }}
        className={ghostBtn}
      >
        Reintentar
      </button>
    </div>
  );
}
