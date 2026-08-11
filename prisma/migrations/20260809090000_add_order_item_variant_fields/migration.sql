ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantValue" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantLabel" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantAttributes" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "variantSku" TEXT;
