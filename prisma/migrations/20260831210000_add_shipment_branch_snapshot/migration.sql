-- Add carrier-agnostic branch snapshot to Shipment
ALTER TABLE "Shipment"
ADD COLUMN "branchExternalId" TEXT,
ADD COLUMN "branchCode" TEXT,
ADD COLUMN "branchName" TEXT,
ADD COLUMN "branchAddress" TEXT,
ADD COLUMN "branchCity" TEXT,
ADD COLUMN "branchProvince" TEXT,
ADD COLUMN "branchPostalCode" TEXT;
