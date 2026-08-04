-- Phase 4 (Finance): fee items, invoices, payments, salaries, expenses

CREATE TABLE "FeeItem" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "classId" INTEGER,
  CONSTRAINT "FeeItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
  "id" SERIAL NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "feeItemId" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Unpaid',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" SERIAL NOT NULL,
  "invoiceId" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "method" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "reference" TEXT,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalaryRecord" (
  "id" SERIAL NOT NULL,
  "recipientType" TEXT NOT NULL,
  "staffId" TEXT,
  "teacherId" TEXT,
  "month" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "paidDate" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "SalaryRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expense" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE INDEX "FeeItem_classId_idx" ON "FeeItem"("classId");
CREATE INDEX "Invoice_studentId_idx" ON "Invoice"("studentId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "SalaryRecord_month_idx" ON "SalaryRecord"("month");

ALTER TABLE "FeeItem" ADD CONSTRAINT "FeeItem_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_feeItemId_fkey"
  FOREIGN KEY ("feeItemId") REFERENCES "FeeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
