"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type AndreaniExportIssue = {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  field: string;
  code: string;
  message: string;
  sheetName?: string | null;
};

export type AndreaniExportShipmentRow = {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  shippingMethod: string;
  carrier: string | null;
  status: string;
  sheetName: string | null;
  parcelCount: number;
  exportable: boolean;
  issues: AndreaniExportIssue[];
  createdAt: string;
  readyAt: string | null;
  recipientName: string;
  branchName: string | null;
};

type AndreaniExportPanelProps = {
  shipments: AndreaniExportShipmentRow[];
  summary: {
    total: number;
    exportable: number;
    blocked: number;
  };
};

function formatMethodLabel(method: string) {
  if (method === "home_delivery") {
    return "A domicilio";
  }

  if (method === "city_branch") {
    return "A sucursal";
  }

  return method;
}

export function AndreaniExportPanel({ shipments, summary }: AndreaniExportPanelProps) {
  const exportableShipments = shipments.filter((shipment) => shipment.exportable);
  const blockedShipments = shipments.filter((shipment) => !shipment.exportable);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => exportableShipments.map((shipment) => shipment.shipmentId));
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<
    | { status: "idle" }
    | { status: "success"; message: string }
    | { status: "error"; message: string; issues?: AndreaniExportIssue[] }
  >({ status: "idle" });

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  async function handleExport() {
    if (selectedIds.length === 0 || isExporting) {
      return;
    }

    setIsExporting(true);
    setFeedback({ status: "idle" });

    try {
      const response = await fetch("/api/admin/shipments/andreani/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shipmentIds: selectedIds }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as {
            message?: string;
            issues?: AndreaniExportIssue[];
          };

          setFeedback({
            status: "error",
            message: payload.message ?? "La exportacion no se pudo completar.",
            issues: payload.issues,
          });
          return;
        }

        setFeedback({
          status: "error",
          message: "La exportacion no se pudo completar.",
        });
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] ?? "andreani-envios.xlsx";

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setFeedback({
        status: "success",
        message: `Archivo generado: ${fileName}`,
      });
    } catch (error) {
      setFeedback({
        status: "error",
        message: error instanceof Error ? error.message : "No se pudo generar el Excel.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  function toggleShipment(shipmentId: string) {
    setSelectedIds((current) =>
      current.includes(shipmentId)
        ? current.filter((currentId) => currentId !== shipmentId)
        : [...current, shipmentId],
    );
  }

  function selectAllExportable() {
    setSelectedIds(exportableShipments.map((shipment) => shipment.shipmentId));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  return (
    <section className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Andreani</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Exportacion masiva</h3>
          <p className="mt-1 text-sm text-muted">
            Selecciona shipments READY con carrier ANDREANI y descarga el Excel oficial.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-muted">
          <p>Total visibles: {summary.total}</p>
          <p>Exportables: {summary.exportable}</p>
          <p>Bloqueados: {summary.blocked}</p>
        </div>
      </div>

      {feedback.status !== "idle" ? (
        <div
          className={cn(
            "mt-4 rounded-2xl border px-4 py-3 text-sm",
            feedback.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900",
          )}
        >
          <p className="font-medium">{feedback.message}</p>
          {feedback.status === "error" && feedback.issues?.length ? (
            <ul className="mt-2 space-y-1 text-xs leading-5">
              {feedback.issues.map((issue) => (
                <li key={`${issue.shipmentId}-${issue.code}-${issue.field}`}>
                  <span className="font-semibold uppercase tracking-[0.12em]">{issue.code}:</span>{" "}
                  {issue.orderNumber} - {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllExportable}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"
        >
          Seleccionar exportables
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"
        >
          Limpiar seleccion
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={selectedCount === 0 || isExporting}
          className="rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isExporting ? "Generando Excel..." : `Exportar Andreani (${selectedCount})`}
        </button>
      </div>

      <div className="mt-5 space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            Listos para exportar
          </h4>
          {exportableShipments.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-left text-sm">
                  <thead className="bg-surface text-xs uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Sel.</th>
                      <th className="px-4 py-3">Pedido</th>
                      <th className="px-4 py-3">Destinatario</th>
                      <th className="px-4 py-3">Metodo</th>
                      <th className="px-4 py-3">Bultos</th>
                      <th className="px-4 py-3">Sucursal</th>
                      <th className="px-4 py-3">Listo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {exportableShipments.map((shipment) => {
                      const checked = selectedIds.includes(shipment.shipmentId);

                      return (
                        <tr key={shipment.shipmentId} className="align-top">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleShipment(shipment.shipmentId)}
                              className="h-4 w-4 rounded border-border"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{shipment.orderNumber}</p>
                            <p className="mt-1 text-xs text-muted">{shipment.shipmentId}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{shipment.recipientName}</p>
                            <p className="mt-1 text-xs text-muted">{shipment.carrier}</p>
                          </td>
                          <td className="px-4 py-3">{formatMethodLabel(shipment.shippingMethod)}</td>
                          <td className="px-4 py-3">{shipment.parcelCount}</td>
                          <td className="px-4 py-3">{shipment.branchName ?? "-"}</td>
                          <td className="px-4 py-3 text-emerald-700">OK</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted">
              No hay shipments exportables por ahora.
            </p>
          )}
        </div>

        {blockedShipments.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              Bloqueados
            </h4>
            <div className="space-y-3">
              {blockedShipments.map((shipment) => (
                <article key={shipment.shipmentId} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{shipment.orderNumber}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-rose-700">
                        {formatMethodLabel(shipment.shippingMethod)} · {shipment.shipmentId}
                      </p>
                    </div>
                    <div className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                      No exportable
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs leading-5">
                    {shipment.issues.map((issue) => (
                      <li key={`${issue.shipmentId}-${issue.code}-${issue.field}`}>
                        <span className="font-semibold uppercase tracking-[0.12em]">{issue.code}:</span>{" "}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
