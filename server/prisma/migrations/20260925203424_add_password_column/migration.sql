/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `read` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `changedBy` on the `ParcelStatusHistory` table. All the data in the column will be lost.
  - You are about to drop the column `transactionReference` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Parcel" DROP CONSTRAINT "Parcel_customerId_fkey";

-- DropForeignKey
ALTER TABLE "ParcelStatusHistory" DROP CONSTRAINT "ParcelStatusHistory_changedBy_fkey";

-- DropForeignKey
ALTER TABLE "ParcelStatusHistory" DROP CONSTRAINT "ParcelStatusHistory_parcelId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_parcelId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "ipAddress";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "read";

-- AlterTable
ALTER TABLE "ParcelStatusHistory" DROP COLUMN "changedBy";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "transactionReference",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelStatusHistory" ADD CONSTRAINT "ParcelStatusHistory_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
