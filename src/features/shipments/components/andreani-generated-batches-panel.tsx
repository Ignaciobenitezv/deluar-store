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
  return batch.hiddenOrderCount > 0 ? `${orders} +${batch.hiddenOrderCount} más` : orders;
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

function getShipmentCountLabel(count: number) {
  return count === 1 ? "1 pedido" : `${count} pedidos`;
}

export function AndreaniGeneratedBatchesPanel({ batches }: AndreaniGeneratedBatchesPanelProps) {
  return (
    <section className="space-y-4">
      <div className="border-b border-slate-200/70 pb-4 lg:rounded-[24px] lg:border lg:border-slate-200/70 lg:bg-white lg:px-4 lg:py-4 lg:shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <div className="min-w-0">
          <p className={dashboardUi.mutedLabel}>Generados</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Lotes históricos ya generados. Podés volver a bajar exactamente el mismo archivo cuando lo necesites.
          </p>
        </div>
      </div>

      {batches.length > 0 ? (
        <>
          <div className="divide-y divide-slate-200/80 lg:hidden">
            {batches.map((batch) => (
              <article key={batch.batchId} className="w-full min-w-0 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">
                      {new Intl.DateTimeFormat("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Argentina/Buenos_Aires",
                      }).format(new Date(batch.createdAt))}
                    </p>
                    <p className="mt-1 break-words text-xs uppercase leading-5 tracking-[0.16em] text-slate-400">
                      {batch.fileName}
                    </p>
                  </div>

                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-[10px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold leading-none tracking-[0.12em] text-emerald-900">
                    {getShipmentCountLabel(batch.shipmentCount)}
                  </span>
                </div>

                <div className="mt-4 grid min-w-0 gap-3 min-[390px]:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] min-[390px]:items-start">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</p>
                    <p
                      title={getBatchSummary(batch)}
                      className="mt-1 truncate text-sm font-medium leading-6 text-slate-900"
                    >
                      {getBatchSummary(batch)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bultos</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{batch.parcelCount}</p>
                  </div>
                </div>

                <div className="mt-4 grid min-w-0 gap-3 min-[390px]:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] min-[390px]:items-start">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Transportista</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{getCarrierLabel(batch.carrier)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Modalidad</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {batch.shippingMethodLabels.join(" · ")}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={batch.downloadHref}
                    className={cn(
                      "inline-flex h-11 w-full items-center justify-center rounded-[10px] border px-4 text-[13px] font-semibold whitespace-nowrap lg:rounded-full lg:px-3.5 lg:py-2.5 lg:text-[13px]",
                      "border-[#314158] bg-[#314158] !text-white shadow-[0_10px_22px_rgba(49,65,88,0.16)] hover:border-[#3b4f69] hover:bg-[#3b4f69]",
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
                          "border-[#314158] bg-[#314158] !text-white shadow-[0_10px_22px_rgba(49,65,88,0.16)] hover:border-[#3b4f69] hover:bg-[#3b4f69]",
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
          <p className="text-sm font-semibold tracking-[-0.02em] text-slate-900">Todavía no hay lotes generados.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Cuando generes un Excel, aparecerá acá para que puedas descargarlo otra vez más adelante.
          </p>
        </div>
      )}
    </section>
  );
}
