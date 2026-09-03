"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import type { AndreaniExportBatchRow } from "../types";

type AndreaniGeneratedBatchesPanelProps = {
  batches: AndreaniExportBatchRow[];
};

function getBatchSummary(batch: AndreaniExportBatchRow) {
  const orders = batch.visibleOrderNumbers.join(" · ");
  return batch.hiddenOrderCount > 0 ? `${orders} +${batch.hiddenOrderCount} mas` : orders;
}

function getCarrierLabel(carrier: AndreaniExportBatchRow["carrier"]) {
  if (carrier === "ANDREANI") {
    return "Andreani";
  }

  if (carrier === "CORREO_ARGENTINO") {
    return "Correo Argentino";
  }

  return carrier;
}

export function AndreaniGeneratedBatchesPanel({ batches }: AndreaniGeneratedBatchesPanelProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:px-5 sm:py-5">
        <div className="min-w-0">
          <p className={dashboardUi.mutedLabel}>Generados</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Lotes historicos ya generados. Podes volver a bajar exactamente el mismo archivo cuando lo necesites.
          </p>
        </div>
      </div>

      {batches.length > 0 ? (
        <>
          <div className="space-y-3 lg:hidden">
            {batches.map((batch) => (
              <article
                key={batch.batchId}
                className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">
                      {new Intl.DateTimeFormat("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Argentina/Buenos_Aires",
                      }).format(new Date(batch.createdAt))}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{batch.fileName}</p>
                  </div>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900">
                    {batch.shipmentCount} pedido(s)
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{getBatchSummary(batch)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Transportista</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{getCarrierLabel(batch.carrier)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Modalidades</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{batch.shippingMethodLabels.join(" · ")}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bultos</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{batch.parcelCount}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={batch.downloadHref}
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold",
                      dashboardUi.primaryAction,
                    )}
                  >
                    Descargar nuevamente
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[1260px] table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: "16%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead className="bg-slate-50/80 text-left">
                <tr className="border-b border-slate-200/70">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fecha</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Archivo</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Transportista</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bultos</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Accion</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.batchId} className="border-t border-slate-200/60 transition hover:bg-slate-50/60">
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-900">
                        {new Intl.DateTimeFormat("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Argentina/Buenos_Aires",
                        }).format(new Date(batch.createdAt))}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{getCarrierLabel(batch.carrier)}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-900">{batch.fileName}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-900">{getBatchSummary(batch)}</p>
                      <p className="mt-1 text-xs text-slate-500">{batch.shipmentCount} pedido(s)</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-900">{getCarrierLabel(batch.carrier)}</p>
                      <p className="mt-1 text-xs text-slate-500">{batch.shippingMethodLabels.join(" · ")}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-900">{batch.parcelCount}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Link
                        href={batch.downloadHref}
                        className={cn(
                          "inline-flex w-full items-center justify-center rounded-[18px] border px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93a6bd]/35",
                          "border-[#d7e0ea] bg-[#f6f9fc] text-[#243247] shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] hover:border-[#c7d3e1] hover:bg-[#eef4f9]",
                        )}
                      >
                        Descargar nuevamente
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <p className="text-sm font-semibold tracking-[-0.02em] text-slate-900">Todavia no hay lotes generados.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Cuando generes un Excel, aparecera aca para que puedas descargarlo otra vez mas adelante.
          </p>
        </div>
      )}
    </section>
  );
}
