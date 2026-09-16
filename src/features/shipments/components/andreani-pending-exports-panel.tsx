"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import type { AndreaniPendingShipmentRow } from "../types";

type CarrierChoice = "ANDREANI" | "CORREO_ARGENTINO";

type AndreaniPendingExportsPanelProps = {
  shipments: AndreaniPendingShipmentRow[];
};

type CarrierModalState = {
  shipmentIds: string[];
};

function getBadgeClasses(tone: "success" | "warning" | "neutral" | "muted") {
  switch (tone) {
    case "success":
      return "border-success/25 bg-success-soft text-success";
    case "warning":
      return "border-warning/25 bg-warning-soft text-warning";
    case "neutral":
      return "border-border bg-surface text-text-primary";
    case "muted":
    default:
      return "border-border bg-surface-elevated text-text-secondary";
  }
}

function formatLocalDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

function buildSelectionLabel(shipments: AndreaniPendingShipmentRow[], shipmentIds: string[]) {
  const selectedOrders = shipments.filter((shipment) => shipmentIds.includes(shipment.shipmentId));
  const orderNumbers = selectedOrders.map((shipment) => `#${shipment.orderNumber}`);

  if (orderNumbers.length === 0) {
    return "Sin pedidos seleccionados";
  }

  if (orderNumbers.length <= 3) {
    return orderNumbers.join(" · ");
  }

  return `${orderNumbers.slice(0, 3).join(" · ")} +${orderNumbers.length - 3} mas`;
}

function buildShipmentIssueSummary(shipment: AndreaniPendingShipmentRow) {
  const messages = [...new Set(shipment.issues.map((issue) => issue.message).filter(Boolean))];

  if (messages.length === 0) {
    return shipment.simpleStateLabel;
  }

  if (messages.length === 1) {
    return messages[0]!;
  }

  return `${messages[0]} y ${messages.length - 1} mas.`;
}

function CarrierModal({
  shipments,
  shipmentIds,
  onClose,
  onSelectCarrier,
  isExporting,
}: {
  shipments: AndreaniPendingShipmentRow[];
  shipmentIds: string[];
  onClose: () => void;
  onSelectCarrier: (carrier: CarrierChoice) => void;
  isExporting: boolean;
}) {
  const label = buildSelectionLabel(shipments, shipmentIds);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface px-5 py-5 shadow-[var(--admin-shadow-md)] sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={dashboardUi.mutedLabel}>Transportista</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-text-primary">
              ¿Con que transportista queres generar el envio?
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-surface-elevated px-3 py-2 text-sm font-semibold text-text-secondary transition-colors duration-150 hover:bg-surface"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">Vas a generar {shipmentIds.length} pedido(s).</p>
          <p className="mt-1 leading-6">{label}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelectCarrier("ANDREANI")}
            disabled={isExporting}
            className={cn(
              "rounded-xl border px-4 py-4 text-left transition-colors duration-150",
              "border-primary bg-primary text-primary-foreground hover:brightness-105",
              isExporting && "cursor-not-allowed opacity-80",
            )}
          >
            <p className="text-sm font-semibold">Andreani</p>
            <p className="mt-1 text-xs leading-5 text-primary-foreground/80">Genera el Excel oficial y crea el lote historico.</p>
          </button>

          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl border border-border bg-surface-elevated px-4 py-4 text-left text-text-secondary"
          >
            <p className="text-sm font-semibold">Correo Argentino</p>
            <p className="mt-1 text-xs leading-5">Proximamente.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export function AndreaniPendingExportsPanel({ shipments }: AndreaniPendingExportsPanelProps) {
  const router = useRouter();
  const exportableShipments = shipments.filter((shipment) => shipment.exportable);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [carrierModal, setCarrierModal] = useState<CarrierModalState | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<
    | { status: "idle" }
    | { status: "success"; message: string }
    | { status: "error"; message: string; issues?: Array<{ orderNumber: string; message: string }> }
  >({ status: "idle" });

  const selectedExportableCount = selectedIds.length;

  function openCarrierModal(shipmentIds: string[]) {
    if (shipmentIds.length === 0) {
      return;
    }

    setCarrierModal({
      shipmentIds,
    });
  }

  function closeCarrierModal() {
    if (isExporting) {
      return;
    }

    setCarrierModal(null);
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

  async function handleExport(shipmentIds: string[], carrier: CarrierChoice) {
    if (shipmentIds.length === 0 || isExporting) {
      return;
    }

    if (carrier !== "ANDREANI") {
      setFeedback({
        status: "error",
        message: "Correo Argentino todavia no esta disponible para esta exportacion.",
      });
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
        body: JSON.stringify({ shipmentIds, carrier }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as {
            message?: string;
            issues?: Array<{ orderNumber: string; message: string }>;
          };

          setFeedback({
            status: "error",
            message: payload.message ?? "No se pudo generar el archivo.",
            issues: payload.issues,
          });
          return;
        }

        setFeedback({
          status: "error",
          message: "No se pudo generar el archivo.",
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

      setSelectedIds([]);
      setCarrierModal(null);
      setFeedback({
        status: "success",
        message: `Archivo generado: ${fileName}`,
      });

      router.replace("/admin/envios?tab=generados");
      router.refresh();
    } catch (error) {
      setFeedback({
        status: "error",
        message: error instanceof Error ? error.message : "No se pudo generar el Excel.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="border-b border-border pb-4 lg:rounded-[24px] lg:border lg:border-border lg:bg-surface lg:px-4 lg:py-4 lg:shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className={dashboardUi.mutedLabel}>Pendientes</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Selecciona uno o varios pedidos y elegi el transportista en el momento de generar la etiqueta.
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.7fr)_minmax(0,1.5fr)] gap-1 min-[390px]:gap-1.5">
            <button
              type="button"
              onClick={selectAllExportable}
              className={cn(
                "inline-flex h-9 min-w-0 w-full items-center justify-center rounded-[10px] border px-2 text-[11px] font-semibold leading-none whitespace-nowrap lg:rounded-full lg:px-4 lg:py-2.5 lg:text-sm",
                dashboardUi.softAction,
              )}
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className={cn(
                "inline-flex h-9 min-w-0 w-full items-center justify-center rounded-[10px] border px-2 text-[11px] font-semibold leading-none whitespace-nowrap lg:rounded-full lg:px-4 lg:py-2.5 lg:text-sm",
                dashboardUi.softAction,
              )}
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => openCarrierModal(selectedIds)}
              disabled={selectedExportableCount === 0 || isExporting}
              className={cn(
                "inline-flex h-9 min-w-0 w-full items-center justify-center rounded-[10px] border px-2 text-[11px] font-semibold leading-none whitespace-nowrap lg:rounded-full lg:px-4 lg:py-2.5 lg:text-sm",
                dashboardUi.primaryAction,
              )}
            >
              {isExporting ? "Generando..." : `Generar etiquetas (${selectedExportableCount})`}
            </button>
          </div>
        </div>

        {feedback.status !== "idle" ? (
          <div
            className={cn(
              "mt-4 rounded-2xl border px-4 py-3 text-sm",
              feedback.status === "success"
                ? "border-success/25 bg-success-soft text-success"
                : "border-danger/25 bg-danger-soft text-danger",
            )}
          >
            <p className="font-medium">{feedback.message}</p>
            {feedback.status === "error" && feedback.issues?.length ? (
              <ul className="mt-2 space-y-1 text-xs leading-5">
                {feedback.issues.map((issue) => (
                  <li key={`${issue.orderNumber}-${issue.message}`}>
                    <span className="font-semibold">Pedido #{issue.orderNumber}</span> - {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {shipments.length > 0 ? (
        <>
          <div className="divide-y divide-border lg:hidden">
            {shipments.map((shipment) => {
              const checked = selectedIds.includes(shipment.shipmentId);
              const canSelect = shipment.exportable;

              return (
                <article key={shipment.shipmentId} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-[-0.02em] text-text-primary">#{shipment.orderNumber}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-secondary">
                        {formatLocalDateTime(shipment.createdAt)}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                        getBadgeClasses(shipment.simpleStateTone),
                      )}
                    >
                      {shipment.simpleStateLabel}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Destinatario</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{shipment.recipientName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Modalidad</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{shipment.shippingMethodLabel}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Destino</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{shipment.destinationLabel}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Cantidad</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {shipment.productUnitCount} productos · {shipment.parcelCount} bultos
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Estado</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">
                        {shipment.exportable ? "Listo para generar" : "Faltan datos"}
                      </p>
                    </div>
                  </div>

                  {!shipment.exportable ? (
                    <div className="mt-4">
                      <p className="text-sm leading-6 text-text-secondary">{buildShipmentIssueSummary(shipment)}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {canSelect ? (
                      <button
                        type="button"
                        onClick={() => toggleShipment(shipment.shipmentId)}
                        className={cn(
                          "inline-flex items-center justify-center rounded-[10px] border px-3 py-2 text-[12px] font-semibold lg:rounded-full lg:px-4 lg:py-2.5 lg:text-sm",
                          checked ? dashboardUi.primaryAction : dashboardUi.softAction,
                        )}
                      >
                        {checked ? "Seleccionado" : "Seleccionar"}
                      </button>
                    ) : null}

                    {shipment.exportable ? (
                      <button
                        type="button"
                        onClick={() => openCarrierModal([shipment.shipmentId])}
                        disabled={isExporting}
                        className={cn(
                          "inline-flex items-center justify-center rounded-[10px] border px-3 py-2 text-[12px] font-semibold lg:rounded-full lg:px-4 lg:py-2.5 lg:text-sm",
                          dashboardUi.primaryAction,
                        )}
                      >
                        Generar etiqueta
                      </button>
                    ) : (
                      <Link
                        href={shipment.orderHref}
                        className={cn(
                          "inline-flex items-center justify-center rounded-[10px] border px-3 py-2 text-[12px] font-semibold lg:rounded-full lg:px-4 lg:py-2.5 lg:text-sm",
                          dashboardUi.softAction,
                        )}
                      >
                        Revisar
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[1360px] table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead className="bg-surface-elevated text-left">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Sel.</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Pedido</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Destinatario</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Modalidad</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Destino</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Cantidad</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Fecha</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Estado</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Accion</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => {
                  const checked = selectedIds.includes(shipment.shipmentId);
                  const canSelect = shipment.exportable;

                  return (
                    <tr key={shipment.shipmentId} className="border-t border-border transition hover:bg-surface-elevated">
                      <td className="px-4 py-4 align-top">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleShipment(shipment.shipmentId)}
                            className="h-4 w-4 rounded border-border"
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold tracking-[-0.02em] text-text-primary">#{shipment.orderNumber}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-text-secondary">
                          {formatLocalDateTime(shipment.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-text-primary">{shipment.recipientName}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-primary">
                          {shipment.shippingMethodLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-text-primary">{shipment.destinationLabel}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-text-primary">
                          {shipment.productUnitCount} productos · {shipment.parcelCount} bultos
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-text-primary">{formatLocalDateTime(shipment.createdAt)}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                            getBadgeClasses(shipment.simpleStateTone),
                          )}
                        >
                          {shipment.simpleStateLabel}
                        </span>
                        {!shipment.exportable ? (
                          <p className="mt-2 text-xs leading-5 text-text-secondary">{buildShipmentIssueSummary(shipment)}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {shipment.exportable ? (
                          <button
                            type="button"
                            onClick={() => openCarrierModal([shipment.shipmentId])}
                            disabled={isExporting}
                            className={cn(
                              "inline-flex w-full items-center justify-center rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                              "border-border bg-surface text-text-primary hover:bg-surface-elevated",
                            )}
                          >
                            Generar etiqueta
                          </button>
                        ) : (
                          <Link
                            href={shipment.orderHref}
                            className={cn(
                              "inline-flex w-full items-center justify-center rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                              "border-border bg-surface text-text-primary hover:bg-surface-elevated",
                            )}
                          >
                            Revisar
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated px-4 py-10 text-center">
          <p className="text-sm font-semibold tracking-[-0.02em] text-text-primary">No hay pedidos pendientes para generar etiquetas.</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Cuando exista un pedido listo para exportar, aparecera aca para generar el archivo.
          </p>
        </div>
      )}

      {carrierModal ? (
        <CarrierModal
          shipments={shipments}
          shipmentIds={carrierModal.shipmentIds}
          onClose={closeCarrierModal}
          onSelectCarrier={(carrier) => {
            if (carrier !== "ANDREANI") {
              return;
            }

            void handleExport(carrierModal.shipmentIds, carrier);
          }}
          isExporting={isExporting}
        />
      ) : null}
    </section>
  );
}
