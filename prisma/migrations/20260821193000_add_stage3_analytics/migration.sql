ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'ORDER_CREATED';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'PURCHASE_COMPLETED';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'CART_ABANDONED';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'CHECKOUT_ABANDONED';

ALTER TYPE "AnalyticsCartStatus" ADD VALUE IF NOT EXISTS 'PURCHASED';
ALTER TYPE "AnalyticsCartStatus" ADD VALUE IF NOT EXISTS 'CART_ABANDONED';
ALTER TYPE "AnalyticsCartStatus" ADD VALUE IF NOT EXISTS 'CHECKOUT_ABANDONED';

ALTER TABLE "AnalyticsEvent" ADD COLUMN "dedupeKey" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "cartId" UUID;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "orderId" UUID;

ALTER TABLE "AnalyticsCart" ADD COLUMN "purchaseCompletedAt" TIMESTAMP(3);
ALTER TABLE "AnalyticsCart" ADD COLUMN "abandonedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "AnalyticsEvent_dedupeKey_key" ON "AnalyticsEvent"("dedupeKey");
CREATE INDEX "AnalyticsEvent_cartId_idx" ON "AnalyticsEvent"("cartId");
CREATE INDEX "AnalyticsEvent_orderId_idx" ON "AnalyticsEvent"("orderId");

CREATE INDEX "AnalyticsCart_status_lastActivityAt_idx" ON "AnalyticsCart"("status", "lastActivityAt");
CREATE INDEX "AnalyticsCart_abandonedAt_idx" ON "AnalyticsCart"("abandonedAt");
CREATE INDEX "AnalyticsCart_purchaseCompletedAt_idx" ON "AnalyticsCart"("purchaseCompletedAt");

ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "AnalyticsCart"("cartId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
