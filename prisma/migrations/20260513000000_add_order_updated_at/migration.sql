-- Add updatedAt to Order so Prisma can maintain modification timestamps.
ALTER TABLE "Order"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
