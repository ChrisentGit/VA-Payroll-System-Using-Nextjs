-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('MONTHLY', 'SEMI_MONTHLY');

-- CreateEnum
CREATE TYPE "RetainerBasis" AS ENUM ('PER_MONTH', 'PER_PERIOD');

-- CreateEnum
CREATE TYPE "ProjectPayMode" AS ENUM ('ON_COMPLETION', 'MILESTONE');

-- AlterTable
ALTER TABLE "Engagement" ADD COLUMN     "projectPayMode" "ProjectPayMode" NOT NULL DEFAULT 'ON_COMPLETION',
ADD COLUMN     "retainerBasis" "RetainerBasis" NOT NULL DEFAULT 'PER_MONTH';

-- AlterTable
ALTER TABLE "PayrollLineItem" ADD COLUMN     "exchangeRate" DECIMAL(12,6),
ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "totalAmountPhp" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "PayrollPeriod" ADD COLUMN     "frequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "warnings" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Timesheet" ADD COLUMN     "payrollLineItemId" TEXT;

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'PHP',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollLineItem_milestoneId_key" ON "PayrollLineItem"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_payrollPeriodId_key" ON "PayrollRun"("payrollPeriodId");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_payrollLineItemId_fkey" FOREIGN KEY ("payrollLineItemId") REFERENCES "PayrollLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLineItem" ADD CONSTRAINT "PayrollLineItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: existing PHP items already have their PHP value
UPDATE "PayrollLineItem" SET "exchangeRate" = 1, "totalAmountPhp" = "totalAmount" WHERE "currency" = 'PHP';

-- Backfill: link timesheets already covered by a run, so they can't be paid again
UPDATE "Timesheet" t
SET "payrollLineItemId" = li."id"
FROM "PayrollLineItem" li
JOIN "PayrollRun" r ON r."id" = li."payrollRunId"
JOIN "PayrollPeriod" p ON p."id" = r."payrollPeriodId"
WHERE li."engagementId" = t."engagementId"
  AND li."rateType" = 'HOURLY'
  AND t."status" = 'APPROVED'
  AND t."date" >= p."startDate"
  AND t."date" <= p."endDate";
