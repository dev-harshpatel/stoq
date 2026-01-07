-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "lastUpdated" TEXT NOT NULL,
    "priceChange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);
