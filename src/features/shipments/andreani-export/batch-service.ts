import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { traceAsync } from "@/lib/perf-trace";
import { SHIPPING_METHODS } from "@/features/shipping/shipping";
import { SHIPMENT_CARRIERS, SHIPMENT_STATUSES, type ShipmentCarrier } from "../types";
import { shipmentExportInclude, toAndreaniExportSource } from "./service";
import { ensureAndreaniShipmentReadyForOrder } from "../server/shipment-service";
import { getAndreaniTemplateMetadata } from "./template";
import { validateAndreaniExcelExport } from "./validation";
import { buildAndreaniWorkbookBuffer } from "./workbook";
import { buildAndreaniFileName } from "./filename";
import { summarizeAndreaniIssues } from "./messages";
import type {
  AndreaniExportIssue,
  AndreaniTemplateMetadata,
} from "./types";
import type {
  AndreaniExportsDashboardData,
  AndreaniExportBatchRow,
  AndreaniPendingShipmentRow,
} from "../types";

const pendingShipmentInclude = shipmentExportInclude satisfies Prisma.ShipmentInclude;

const batchInclude = {
  shipments: {
    include: shipmentExportInclude,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.AndreaniExportBatchInclude;

type PendingShipmentRecord = Prisma.ShipmentGetPayload<{ include: typeof pendingShipmentInclude }>;
type BatchRecord = Prisma.AndreaniExportBatchGetPayload<{ include: typeof batchInclude }>;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function shippingMethodLabel(method: string) {
  if (method === SHIPPING_METHODS.HOME_DELIVERY) {
    return "A domicilio";
  }

  if (method === SHIPPING_METHODS.CITY_BRANCH) {
    return "A sucursal";
  }

  return "Retiro local";
}

function destinationLabel(record: PendingShipmentRecord) {
  const shippingAddress = record.order.shippingAddress;

  if (record.order.shippingMethod === SHIPPING_METHODS.HOME_DELIVERY) {
    const streetLine = [shippingAddress?.street, shippingAddress?.streetNumber].filter(Boolean).join(" ").trim();
    const locationLine = [shippingAddress?.city, shippingAddress?.province].filter(Boolean).join(", ").trim();

    return [streetLine, locationLine].filter(Boolean).join(" · ").trim() || "Pendiente de completar";
  }

  if (record.order.shippingMethod === SHIPPING_METHODS.CITY_BRANCH) {
    const branchName = record.branchName?.trim() || "Sucursal";
    const branchLocation = [record.branchCity, record.branchProvince].filter(Boolean).join(", ").trim();

    return [branchName, branchLocation].filter(Boolean).join(" · ").trim() || "Pendiente de completar";
  }

  return "Retiro local";
}

function totalProductUnits(record: PendingShipmentRecord) {
  return record.order.items.reduce((total, item) => total + item.quantity, 0);
}

function getRecipientName(record: PendingShipmentRecord) {
  const shippingAddress = record.order.shippingAddress;

  return [
    shippingAddress?.firstName ?? record.order.customer.firstName,
    shippingAddress?.lastName ?? record.order.customer.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function toPendingRow(
  record: PendingShipmentRecord,
  exportable: boolean,
  issues: AndreaniExportIssue[],
): AndreaniPendingShipmentRow {
  const recipientName = getRecipientName(record) || record.order.orderNumber;
  const issueSummary = summarizeAndreaniIssues(issues);
  const humanSummary = issueSummary ?? (record.status === SHIPMENT_STATUSES.DRAFT ? "Borrador" : "Requiere revisión");
  const simpleStateTone = exportable
    ? "success"
    : record.status === SHIPMENT_STATUSES.DRAFT
      ? "neutral"
      : "warning";

  return {
    shipmentId: record.id,
    orderId: record.order.id,
    orderNumber: record.order.orderNumber,
    createdAt: record.createdAt.toISOString(),
    readyAt: toIso(record.readyAt),
    recipientName,
    shippingMethod: record.order.shippingMethod,
    shippingMethodLabel: shippingMethodLabel(record.order.shippingMethod),
    destinationLabel: destinationLabel(record),
    productUnitCount: totalProductUnits(record),
    carrier: record.carrier,
    status: record.status,
    parcelCount: record.parcels.length,
    exportable,
    simpleStateTone,
    simpleStateLabel: exportable ? "Listo para generar" : humanSummary,
    issueSummary,
    issues,
    orderHref: `/admin/orders/${record.order.id}`,
  };
}

function mapBatchRecord(batch: BatchRecord): AndreaniExportBatchRow {
  const shipments = batch.shipments;
  const orderNumbers = shipments.map((shipment) => shipment.order.orderNumber);
  const shippingMethodLabels = [...new Set(shipments.map((shipment) => shippingMethodLabel(shipment.shippingMethod)))];
  const parcelCount = shipments.reduce((total, shipment) => total + shipment.parcels.length, 0);

  return {
    batchId: batch.id,
    createdAt: batch.createdAt.toISOString(),
    fileName: batch.fileName,
    carrier: batch.carrier,
    shipmentCount: shipments.length,
    orderNumbers,
    visibleOrderNumbers: orderNumbers.slice(0, 3),
    hiddenOrderCount: Math.max(0, orderNumbers.length - 3),
    shippingMethodLabels,
    parcelCount,
    downloadHref: `/api/admin/shipments/andreani/exports/${batch.id}/download`,
  };
}

async function buildPendingRows(records: PendingShipmentRecord[], metadata: AndreaniTemplateMetadata) {
  const sources = records.map((record) => ({
    ...toAndreaniExportSource(record),
    carrier: SHIPMENT_CARRIERS.ANDREANI,
  }));
  const plan = await validateAndreaniExcelExport(sources, metadata);
  const planByShipmentId = new Map(plan.shipments.map((shipment) => [shipment.shipmentId, shipment]));

  return records.map((record) => {
    const report = planByShipmentId.get(record.id);
    const exportable = Boolean(report?.exportable);

    return toPendingRow(record, exportable, report?.issues ?? []);
  });
}

function buildSelectionError(
  message: string,
  issues: AndreaniExportIssue[],
  status: number,
) {
  return {
    ok: false as const,
    status,
    message,
    issues,
  };
}

function makeIssue(
  shipmentId: string,
  orderId: string,
  orderNumber: string,
  field: string,
  code: string,
  message: string,
): AndreaniExportIssue {
  return {
    shipmentId,
    orderId,
    orderNumber,
    field,
    code,
    message,
  };
}

export async function getAndreaniExportsDashboardData(q = ""): Promise<AndreaniExportsDashboardData> {
  const normalizedQuery = q.trim().toLowerCase();
  const metadata = await traceAsync("admin.envios", "andreani_template_metadata", async () => {
    return getAndreaniTemplateMetadata();
  });

  const [pendingRecords, generatedBatchRecords] = await Promise.all([
    traceAsync("admin.envios", "query_pending_shipments", async () => {
      return prisma.shipment.findMany({
        where: {
          andreaniExportBatchId: null,
          order: {
            shippingMethod: {
              in: [SHIPPING_METHODS.HOME_DELIVERY, SHIPPING_METHODS.CITY_BRANCH],
            },
          },
        },
        include: pendingShipmentInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
    }),
    traceAsync("admin.envios", "query_generated_batches", async () => {
      return prisma.andreaniExportBatch.findMany({
        include: batchInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
    }),
  ]);

  const pendingRows = await traceAsync("admin.envios", "validate_pending_rows", async () => {
    return buildPendingRows(pendingRecords, metadata);
  });

  const generatedBatches = generatedBatchRecords.map(mapBatchRecord);

  const filteredPending = normalizedQuery
    ? pendingRows.filter((row) => {
        const haystack = [
          row.orderNumber,
          row.recipientName,
          row.shippingMethodLabel,
          row.simpleStateLabel,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : pendingRows;

  const filteredBatches = normalizedQuery
    ? generatedBatches.filter((batch) => {
        const haystack = [
          batch.fileName,
          batch.orderNumbers.join(" "),
          batch.shippingMethodLabels.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : generatedBatches;

  return {
    pendingShipments: filteredPending,
    generatedBatches: filteredBatches,
    summary: {
      pending: filteredPending.length,
      exportable: filteredPending.filter((row) => row.exportable).length,
      generatedBatches: filteredBatches.length,
      generatedShipments: filteredBatches.reduce((total, batch) => total + batch.shipmentCount, 0),
      blocked: filteredPending.filter((row) => !row.exportable).length,
    },
  };
}

export async function getAndreaniExportBatch(batchId: string) {
  return prisma.andreaniExportBatch.findUnique({
    where: { id: batchId },
    include: batchInclude,
  });
}

export async function createAndreaniExportBatchFromShipmentIds(
  shipmentIds: string[],
  carrier: ShipmentCarrier = SHIPMENT_CARRIERS.ANDREANI,
) {
  const uniqueIds = [...new Set(shipmentIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return buildSelectionError(
      "Debes seleccionar al menos un envío.",
      [makeIssue("selection", "selection", "selection", "shipmentIds", "SHIPMENT_IDS_REQUIRED", "Debes seleccionar al menos un envío.")],
      400,
    );
  }

  const selectedShipments = await traceAsync("admin.envios", "query_selected_shipments", async () => {
    return prisma.shipment.findMany({
      where: {
        id: { in: uniqueIds },
      },
      select: {
        id: true,
        orderId: true,
        andreaniExportBatchId: true,
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });
  });

  const byId = new Map(selectedShipments.map((shipment) => [shipment.id, shipment] as const));
  const missingIds = uniqueIds.filter((id) => !byId.has(id));
  const alreadyGeneratedIds = selectedShipments
    .filter((shipment) => shipment.andreaniExportBatchId)
    .map((shipment) => shipment.id);

  if (missingIds.length > 0) {
    return buildSelectionError(
      "Hay envíos seleccionados que no existen.",
      missingIds.map((shipmentId) =>
        makeIssue(shipmentId, "unknown", "unknown", "shipmentIds", "SHIPMENT_NOT_FOUND", "El envío no existe."),
      ),
      404,
    );
  }

  if (alreadyGeneratedIds.length > 0) {
    return buildSelectionError(
      "Hay envíos seleccionados que ya fueron generados.",
      alreadyGeneratedIds.map((shipmentId) => {
        const shipment = byId.get(shipmentId);
        return makeIssue(
          shipmentId,
          shipment?.orderId ?? "unknown",
          shipment?.order.orderNumber ?? "unknown",
          "andreaniExportBatchId",
          "SHIPMENT_ALREADY_GENERATED",
          "El envío ya pertenece a un lote generado.",
        );
      }),
      409,
    );
  }

  const uniqueOrderIds = [...new Set(selectedShipments.map((shipment) => shipment.orderId))];

  await traceAsync("admin.envios", "prepare_selected_shipments", async () => {
    await Promise.all(uniqueOrderIds.map((orderId) => ensureAndreaniShipmentReadyForOrder(orderId)));
  });

  const records = await traceAsync("admin.envios", "load_selected_records", async () => {
    return prisma.shipment.findMany({
      where: {
        id: { in: uniqueIds },
        andreaniExportBatchId: null,
      },
      include: pendingShipmentInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });

  if (records.length !== uniqueIds.length) {
    const foundIds = new Set(records.map((record) => record.id));
    const unresolvedIds = uniqueIds.filter((id) => !foundIds.has(id));

    return buildSelectionError(
      "No se pudieron recuperar todos los envíos seleccionados.",
      unresolvedIds.map((shipmentId) =>
        makeIssue(shipmentId, "unknown", "unknown", "shipmentIds", "SHIPMENT_NOT_FOUND", "El envío no existe o ya no está disponible."),
      ),
      404,
    );
  }

  const metadata = await traceAsync("admin.envios", "andreani_template_metadata_export", async () => {
    return getAndreaniTemplateMetadata();
  });
  const sources = records.map((record) => ({
    ...toAndreaniExportSource(record),
    carrier,
  }));
  const plan = await traceAsync("admin.envios", "validate_andreani_export", async () => {
    return validateAndreaniExcelExport(sources, metadata);
  });

  if (plan.issues.length > 0) {
    return buildSelectionError("La selección contiene envíos inválidos.", plan.issues, 422);
  }

  const buffer = await traceAsync("admin.envios", "build_workbook", async () => {
    return buildAndreaniWorkbookBuffer(plan.rowsBySheet, metadata);
  });
  const fileName = buildAndreaniFileName();

  const batch = await traceAsync("admin.envios", "persist_batch", async () => {
    return prisma.$transaction(async (tx) => {
      const createdBatch = await tx.andreaniExportBatch.create({
        data: {
          carrier,
          fileName,
          archiveStorageKey: null,
          archiveBytes: new Uint8Array(buffer),
        },
      });

      const updated = await tx.shipment.updateMany({
        where: {
          id: { in: uniqueIds },
          andreaniExportBatchId: null,
        },
        data: {
          andreaniExportBatchId: createdBatch.id,
          carrier,
        },
      });

      if (updated.count !== uniqueIds.length) {
        throw new Error("No se pudo asociar todos los envíos al lote Andreani.");
      }

      return createdBatch;
    });
  });

  return {
    ok: true as const,
    batchId: batch.id,
    fileName,
    buffer,
    rows: plan.rows,
    shipments: plan.shipments,
  };
}
