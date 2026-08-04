-- Phase 7 (System): settings key/value store, audit log

CREATE TABLE "Setting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AuditLog" (
  "id" SERIAL NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
