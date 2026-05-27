ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'GOCUOTAS';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'GOCUOTAS';

ALTER TABLE "Order"
  ADD COLUMN "externalReference" TEXT,
  ADD COLUMN "rawProviderStatus" TEXT,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "installments" INTEGER;

CREATE INDEX "Order_externalReference_idx" ON "Order"("externalReference");
