-- Phase 5 (Communication): notifications + per-user read state, internal messages

CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationRead" (
  "id" SERIAL NOT NULL,
  "notificationId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" SERIAL NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "recipientRole" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_role_idx" ON "Notification"("role");
CREATE UNIQUE INDEX "NotificationRead_notificationId_userId_key" ON "NotificationRead"("notificationId", "userId");
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
