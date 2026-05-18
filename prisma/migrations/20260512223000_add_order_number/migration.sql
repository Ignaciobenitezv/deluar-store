-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderNumber" TEXT;

-- Backfill existing rows defensively before enforcing required/unique constraints.
UPDATE "Order"
SET "orderNumber" = CONCAT('DLR-MIG-', SUBSTRING("id"::TEXT, 1, 8))
WHERE "orderNumber" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
