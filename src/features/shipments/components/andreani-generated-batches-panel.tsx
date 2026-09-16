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

const downloadButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-primary bg-primary text-primary-foreground transition-colors duration-150 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export function AndreaniGeneratedBatchesPanel({ batches }: AndreaniGeneratedBatchesPanelProps) {
  return (
    <section className="space-y-4">
      <div className="border-b border-border pb-4 lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:px-4 lg:py-4">
        <div className="min-w-0">
          <p className={dashboardUi.mutedLabel}>Generados</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Lotes históricos ya generados. Podés volver a bajar exactamente el mismo archivo cuando lo necesites.
          </p>
        </div>
      </div>

      {batches.length > 0 ? (
        <>
          <div className="divide-y divide-border lg:hidden">
            {batches.map((batch) => (
              <article key={batch.batchId} className="w-full min-w-0 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-[-0.01em] text-text-primary">
                      {new Intl.DateTimeFormat("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Argentina/Buenos_Aires",
                      }).format(new Date(batch.createdAt))}
                    </p>
                    <p className="mt-1 break-words text-xs uppercase leading-5 tracking-[0.16em] text-text-secondary">
                      {batch.fileName}
                    </p>
                  </div>

                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-success/25 bg-success-soft px-2 py-1 text-[10px] font-semibold leading-none tracking-[0.12em] text-success">
                    {getShipmentCountLabel(batch.shipmentCount)}
                  </span>
                </div>

                <div className="mt-4 grid min-w-0 gap-3 min-[390px]:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] min-[390px]:items-start">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Pedidos</p>
                    <p title={getBatchSummary(batch)} className="mt-1 truncate text-sm font-medium leading-6 text-text-primary">
                      {getBatchSummary(batch)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Bultos</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{batch.parcelCount}</p>
                  </div>
                </div>

                <div className="mt-4 grid min-w-0 gap-3 min-[390px]:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] min-[390px]:items-start">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Transportista</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{getCarrierLabel(batch.carrier)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Modalidad</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{batch.shippingMethodLabels.join(" · ")}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Link href={batch.downloadHref} className={cn(downloadButtonClass, "h-11 w-full px-4 text-[13px] font-semibold whitespace-nowrap")}>
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
              <thead className="bg-surface-elevated text-left">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Fecha</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Archivo</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Pedidos</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Transportista</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Bultos</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Accion</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.batchId} className="border-t border-border transition-colors duration-150 hover:bg-surface-elevated">
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-text-primary">
                        {new Intl.DateTimeFormat("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Argentina/Buenos_Aires",
                        }).format(new Date(batch.createdAt))}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">{getCarrierLabel(batch.carrier)}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-text-primary">{batch.fileName}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-text-primary">{getBatchSummary(batch)}</p>
                      <p className="mt-1 text-xs text-text-secondary">{batch.shipmentCount} pedido(s)</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-text-primary">{getCarrierLabel(batch.carrier)}</p>
                      <p className="mt-1 text-xs text-text-secondary">{batch.shippingMethodLabels.join(" · ")}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-text-primary">{batch.parcelCount}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Link href={batch.downloadHref} className={cn(downloadButtonClass, "w-full px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap")}>
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
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated px-4 py-10 text-center">
          <p className="text-sm font-semibold tracking-[-0.01em] text-text-primary">Todavía no hay lotes generados.</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Cuando generes un Excel, aparecerá acá para que puedas descargarlo otra vez más adelante.
          </p>
        </div>
      )}
    </section>
  );
}
