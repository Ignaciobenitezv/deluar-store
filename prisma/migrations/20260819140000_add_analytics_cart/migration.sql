-- CreateEnum
CREATE TYPE "AnalyticsCartStatus" AS ENUM ('ACTIVE', 'CHECKOUT_STARTED', 'ORDER_CREATED');

-- CreateTable
CREATE TABLE "AnalyticsCart" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "visitorId" UUID NOT NULL,
    "sessionId" UUID,
    "status" "AnalyticsCartStatus" NOT NULL DEFAULT 'ACTIVE',
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itemsSnapshot" JSONB NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "checkoutStartedAt" TIMESTAMP(3),
    "checkoutInfoCompletedAt" TIMESTAMP(3),
    "convertedOrderId" UUID,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsCart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsCart_cartId_key" ON "AnalyticsCart"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsCart_convertedOrderId_key" ON "AnalyticsCart"("convertedOrderId");

-- CreateIndex
CREATE INDEX "AnalyticsCart_status_idx" ON "AnalyticsCart"("status");

-- CreateIndex
CREATE INDEX "AnalyticsCart_lastActivityAt_idx" ON "AnalyticsCart"("lastActivityAt");

-- CreateIndex
CREATE INDEX "AnalyticsCart_visitorId_idx" ON "AnalyticsCart"("visitorId");

-- CreateIndex
CREATE INDEX "AnalyticsCart_sessionId_idx" ON "AnalyticsCart"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsCart_convertedOrderId_idx" ON "AnalyticsCart"("convertedOrderId");

-- AddForeignKey
ALTER TABLE "AnalyticsCart" ADD CONSTRAINT "AnalyticsCart_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "AnalyticsVisitor"("visitorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsCart" ADD CONSTRAINT "AnalyticsCart_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("sessionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsCart" ADD CONSTRAINT "AnalyticsCart_convertedOrderId_fkey" FOREIGN KEY ("convertedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
