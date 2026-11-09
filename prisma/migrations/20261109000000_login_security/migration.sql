-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "LoginThrottle_windowStart_idx" ON "LoginThrottle"("windowStart");
