CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "sanityProductId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_sanityProductId_key" ON "Product"("sanityProductId");

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

CREATE INDEX "Product_slug_idx" ON "Product"("slug");

CREATE INDEX "Product_trackInventory_stock_idx" ON "Product"("trackInventory", "stock");

CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
