-- CreateTable
CREATE TABLE "AndreaniExportBatch" (
    "id" UUID NOT NULL,
    "carrier" "ShipmentCarrier" NOT NULL DEFAULT 'ANDREANI',
    "fileName" TEXT NOT NULL,
    "archiveStorageKey" TEXT,
    "archiveBytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AndreaniExportBatch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Shipment"
ADD COLUMN "andreaniExportBatchId" UUID;

-- CreateIndex
CREATE INDEX "AndreaniExportBatch_carrier_createdAt_idx" ON "AndreaniExportBatch"("carrier", "createdAt");

-- CreateIndex
CREATE INDEX "AndreaniExportBatch_createdAt_idx" ON "AndreaniExportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "Shipment_andreaniExportBatchId_idx" ON "Shipment"("andreaniExportBatchId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_andreaniExportBatchId_fkey" FOREIGN KEY ("andreaniExportBatchId") REFERENCES "AndreaniExportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
