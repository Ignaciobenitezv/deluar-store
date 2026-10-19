"use client";

import { useMemo, useState } from "react";
import type { Order } from "@/features/order/types";

type TransferPaymentInstructionsProps = {
  order: Order;
};

const bankDetails = {
  bank: "Banco Santander",
  holder: "Lucila Dellamea",
  alias: "deluardeco",
  cbu: "0720148288000001694372",
};

function BankIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 9.5 12 4l8.5 5.5" />
      <path d="M5 10h14" />
      <path d="M6.5 10v7" />
      <path d="M10.2 10v7" />
      <path d="M13.8 10v7" />
      <path d="M17.5 10v7" />
      <path d="M4.5 17h15" />
      <path d="M3.5 20h17" />
    </svg>
  );
}

function CopyButton({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-accent/50 bg-surface-raised/82 px-4 text-xs font-medium uppercase tracking-[0.18em] text-brand transition-all hover:-translate-y-0.5 hover:border-brand/35 hover:bg-canvas/60"
    >
      {copied ? "Copiado" : label}
    </button>
  );
}

export function TransferPaymentInstructions({
  order,
}: TransferPaymentInstructionsProps) {
  const whatsappUrl = useMemo(() => {
    const message = `Hola! Ya realicé la transferencia de la orden ${order.orderNumber}`;

    return `https://wa.me/543624750741?text=${encodeURIComponent(message)}`;
  }, [order.orderNumber]);

  return (
    <section className="mx-auto max-w-3xl rounded-[1.45rem] border border-accent/40 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_98%,transparent),color-mix(in_srgb,var(--canvas)_96%,transparent))] p-4 shadow-[0_18px_46px_color-mix(in_srgb,var(--ink)_9%,transparent)] sm:rounded-[1.6rem] sm:p-7">
      <div className="flex items-start gap-3.5 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-raised/70 bg-line/60 text-brand shadow-[0_10px_24px_color-mix(in_srgb,var(--ink)_8%,transparent)] sm:h-11 sm:w-11">
          <BankIcon />
        </div>
        <div className="min-w-0 space-y-1.5 sm:space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">
            En espera de pago
          </p>
          <h2 className="text-xl font-semibold leading-[1.12] tracking-[0.01em] text-foreground sm:text-3xl sm:leading-tight sm:tracking-[0.02em]">
            Esperando comprobante de pago
          </h2>
          <p className="text-sm leading-6 text-muted sm:leading-7">
            Transferi el total de la orden a la cuenta indicada y luego envianos el
            comprobante para confirmar tu compra.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 sm:mt-7 sm:gap-3">
        <div className="rounded-[1.1rem] border border-line/80 bg-surface-raised/72 p-3.5 sm:rounded-[1.2rem] sm:p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Banco</p>
          <p className="mt-1 text-base font-medium text-foreground">{bankDetails.bank}</p>
        </div>
        <div className="rounded-[1.1rem] border border-line/80 bg-surface-raised/72 p-3.5 sm:rounded-[1.2rem] sm:p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Titular</p>
          <p className="mt-1 text-base font-medium text-foreground">
            {bankDetails.holder}
          </p>
        </div>
        <div className="rounded-[1.1rem] border border-line/80 bg-surface-raised/72 p-3.5 sm:rounded-[1.2rem] sm:p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Alias</p>
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="break-all text-lg font-semibold tracking-[0.02em] text-foreground">
              {bankDetails.alias}
            </p>
            <CopyButton label="Copiar Alias" value={bankDetails.alias} />
          </div>
        </div>
        <div className="rounded-[1.1rem] border border-line/80 bg-surface-raised/72 p-3.5 sm:rounded-[1.2rem] sm:p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">CBU</p>
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="break-all text-lg font-semibold tracking-[0.02em] text-foreground">
              {bankDetails.cbu}
            </p>
            <CopyButton label="Copiar CBU" value={bankDetails.cbu} />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.1rem] border border-accent/40 bg-canvas/40 p-3.5 sm:mt-7 sm:rounded-[1.2rem] sm:p-4">
        <p className="text-sm leading-6 text-muted sm:leading-7">
          Una vez realizada la transferencia, envianos el comprobante por WhatsApp o
          email.
        </p>
        <a
          href="mailto:deluar2024@hotmail.com"
          className="mt-1 inline-flex text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          deluar2024@hotmail.com
        </a>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cta px-5 text-sm font-medium uppercase tracking-[0.18em] shadow-[0_14px_30px_color-mix(in_srgb,var(--ink)_16%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-cta-hover sm:mt-6 sm:min-h-12 sm:w-auto"
      >
        {/* Colour on a span: the global `a { color: inherit }` rule beats utilities on links. */}
        <span className="text-cta-foreground">Enviar comprobante</span>
      </a>
    </section>
  );
}
