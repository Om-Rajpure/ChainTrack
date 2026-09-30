-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANUFACTURER', 'DISTRIBUTOR', 'RETAILER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('CREATED', 'IN_TRANSIT', 'AT_DISTRIBUTOR', 'AT_RETAILER', 'SOLD');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('REGISTERED', 'TRANSFER_INITIATED', 'TRANSFER_ACCEPTED', 'TRANSFER_REJECTED', 'LOCATION_UPDATE', 'SOLD');

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationName" TEXT,
    "contactEmail" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "chainProductId" INTEGER,
    "serialNumber" TEXT NOT NULL,
    "dataHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "batchNumber" TEXT NOT NULL,
    "manufacturingDate" DATE NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "imageUrl" TEXT,
    "imageHash" TEXT,
    "manufacturerAddress" TEXT NOT NULL,
    "currentOwner" TEXT,
    "pendingReceiver" TEXT,
    "currentStatus" "ProductStatus",
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "registrationTxHash" TEXT,
    "draftExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "chainProductId" INTEGER NOT NULL,
    "eventType" "EventType" NOT NULL,
    "actor" TEXT NOT NULL,
    "counterparty" TEXT,
    "location" TEXT,
    "note" TEXT,
    "blockNumber" INTEGER NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthNonce" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexerState" (
    "id" TEXT NOT NULL,
    "lastProcessedBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_walletAddress_key" ON "Participant"("walletAddress");

-- CreateIndex
CREATE INDEX "Participant_role_idx" ON "Participant"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Product_chainProductId_key" ON "Product"("chainProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_serialNumber_key" ON "Product"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_dataHash_key" ON "Product"("dataHash");

-- CreateIndex
CREATE INDEX "Product_manufacturerAddress_idx" ON "Product"("manufacturerAddress");

-- CreateIndex
CREATE INDEX "Product_currentOwner_idx" ON "Product"("currentOwner");

-- CreateIndex
CREATE INDEX "Product_pendingReceiver_idx" ON "Product"("pendingReceiver");

-- CreateIndex
CREATE INDEX "Product_currentStatus_idx" ON "Product"("currentStatus");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isConfirmed_draftExpiresAt_idx" ON "Product"("isConfirmed", "draftExpiresAt");

-- CreateIndex
CREATE INDEX "ProductEvent_chainProductId_blockNumber_logIndex_idx" ON "ProductEvent"("chainProductId", "blockNumber", "logIndex");

-- CreateIndex
CREATE INDEX "ProductEvent_actor_idx" ON "ProductEvent"("actor");

-- CreateIndex
CREATE UNIQUE INDEX "ProductEvent_txHash_logIndex_key" ON "ProductEvent"("txHash", "logIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AuthNonce_nonce_key" ON "AuthNonce"("nonce");

-- CreateIndex
CREATE INDEX "AuthNonce_address_idx" ON "AuthNonce"("address");

-- CreateIndex
CREATE INDEX "AuthNonce_expiresAt_idx" ON "AuthNonce"("expiresAt");
