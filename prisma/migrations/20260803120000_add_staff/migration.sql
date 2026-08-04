-- Phase 3: Non-teaching staff directory, staff attendance and performance
-- reviews. Staff are admin-managed records (not login accounts).

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "joinDate" TIMESTAMP(3) NOT NULL,
    "birthday" TIMESTAMP(3),
    "sex" "UserSex",
    "img" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_phone_key" ON "Staff"("phone");

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" SERIAL NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "present" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_staffId_date_key" ON "StaffAttendance"("staffId", "date");

-- CreateTable
CREATE TABLE "StaffPerformance" (
    "id" SERIAL NOT NULL,
    "staffId" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,

    CONSTRAINT "StaffPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffPerformance_staffId_idx" ON "StaffPerformance"("staffId");

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPerformance" ADD CONSTRAINT "StaffPerformance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
