-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO', 'GETNET');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentProvider" "PaymentProvider";
ALTER TABLE "Order" ADD COLUMN "providerPreferenceId" TEXT;
ALTER TABLE "Order" ADD COLUMN "providerPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_providerPreferenceId_key" ON "Order"("providerPreferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_providerPaymentId_key" ON "Order"("providerPaymentId");

-- CreateTable
CREATE TABLE "MercadoPagoWebhookEvent" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "providerEventId" TEXT,
    "providerPaymentId" TEXT,
    "externalReference" TEXT,
    "topic" TEXT,
    "action" TEXT,
    "orderId" UUID,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MercadoPagoWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MercadoPagoWebhookEvent_dedupeKey_key" ON "MercadoPagoWebhookEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "MercadoPagoWebhookEvent_providerEventId_idx" ON "MercadoPagoWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "MercadoPagoWebhookEvent_providerPaymentId_idx" ON "MercadoPagoWebhookEvent"("providerPaymentId");

-- CreateIndex
CREATE INDEX "MercadoPagoWebhookEvent_externalReference_idx" ON "MercadoPagoWebhookEvent"("externalReference");

-- CreateIndex
CREATE INDEX "MercadoPagoWebhookEvent_createdAt_idx" ON "MercadoPagoWebhookEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "MercadoPagoWebhookEvent" ADD CONSTRAINT "MercadoPagoWebhookEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
