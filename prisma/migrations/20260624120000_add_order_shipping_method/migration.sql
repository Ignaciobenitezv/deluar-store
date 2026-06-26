ALTER TABLE "Order"
  ADD COLUMN "shippingMethod" TEXT NOT NULL DEFAULT 'home_delivery';

CREATE INDEX "Order_shippingMethod_idx" ON "Order"("shippingMethod");
