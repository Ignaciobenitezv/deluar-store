-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- AlterTable
ALTER TABLE "ShippingAddress"
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneAreaCode" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "streetNumber" TEXT,
ADD COLUMN     "floor" TEXT;

-- AlterTable
ALTER TABLE "OrderItem"
ADD COLUMN     "weightGrams" INTEGER,
ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "widthCm" INTEGER,
ADD COLUMN     "depthCm" INTEGER;
