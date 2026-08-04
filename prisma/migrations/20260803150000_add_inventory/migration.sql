-- Phase 6 (Inventory): items plus issue/return records

CREATE TABLE "InventoryItem" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "location" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryIssue" (
  "id" SERIAL NOT NULL,
  "itemId" INTEGER NOT NULL,
  "borrowerType" TEXT NOT NULL,
  "borrowerName" TEXT NOT NULL,
  "issuedDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "returnedDate" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "InventoryIssue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");
CREATE INDEX "InventoryIssue_itemId_idx" ON "InventoryIssue"("itemId");
CREATE INDEX "InventoryIssue_returnedDate_idx" ON "InventoryIssue"("returnedDate");

ALTER TABLE "InventoryIssue" ADD CONSTRAINT "InventoryIssue_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
