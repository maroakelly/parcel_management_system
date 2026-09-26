/*
  SAFE DATABASE MIGRATION
  Preserves existing users, drivers, parcels and payments.
*/

-- =========================================================
-- 1. Update PaymentMethod enum safely
-- =========================================================

BEGIN;

CREATE TYPE "PaymentMethod_new" AS ENUM (
  'CASH_ON_DELIVERY',
  'MPESA',
  'CARD',
  'ONLINE'
);

ALTER TABLE "Payment"
ALTER COLUMN "method" DROP DEFAULT;

ALTER TABLE "Payment"
ALTER COLUMN "method" TYPE "PaymentMethod_new"
USING (
  CASE
    WHEN "method"::text = 'CASH' THEN 'CASH_ON_DELIVERY'
    ELSE "method"::text
  END
)::"PaymentMethod_new";

ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";

DROP TYPE "public"."PaymentMethod_old";

ALTER TABLE "Payment"
ALTER COLUMN "method" SET DEFAULT 'CASH_ON_DELIVERY';

COMMIT;


-- =========================================================
-- 2. Update PaymentStatus enum safely
-- =========================================================

BEGIN;

CREATE TYPE "PaymentStatus_new" AS ENUM (
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED'
);

ALTER TABLE "Payment"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Payment"
ALTER COLUMN "status" TYPE "PaymentStatus_new"
USING (
  CASE
    WHEN "status"::text = 'COMPLETED' THEN 'PAID'
    ELSE "status"::text
  END
)::"PaymentStatus_new";

ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";

DROP TYPE "public"."PaymentStatus_old";

ALTER TABLE "Payment"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

COMMIT;


-- =========================================================
-- 3. Add Driver updatedAt
-- =========================================================

ALTER TABLE "Driver"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Driver"
ALTER COLUMN "updatedAt" DROP DEFAULT;


-- =========================================================
-- 4. Add Parcel sender information
-- =========================================================

ALTER TABLE "Parcel"
ADD COLUMN "senderName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Parcel"
ADD COLUMN "senderPhone" TEXT NOT NULL DEFAULT '';


-- Copy existing customer information into sender fields
UPDATE "Parcel" p
SET
  "senderName" = COALESCE(u."name", ''),
  "senderPhone" = COALESCE(u."phone", '')
FROM "User" u
WHERE p."customerId" = u."id";


ALTER TABLE "Parcel"
ALTER COLUMN "senderName" DROP DEFAULT;

ALTER TABLE "Parcel"
ALTER COLUMN "senderPhone" DROP DEFAULT;


-- =========================================================
-- 5. Add Payment fields
-- =========================================================

ALTER TABLE "Payment"
ADD COLUMN "failureReason" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "mpesaReceiptNumber" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "phoneNumber" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "transactionId" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Payment"
ADD COLUMN "userId" INTEGER;


-- Preserve existing transaction references
UPDATE "Payment"
SET "transactionId" = "transactionReference"
WHERE "transactionReference" IS NOT NULL
  AND "transactionId" IS NULL;


-- =========================================================
-- 6. Add User password
-- =========================================================

ALTER TABLE "User"
ADD COLUMN "password" TEXT NOT NULL DEFAULT '';


-- Copy existing password hashes
UPDATE "User"
SET "password" = "passwordHash"
WHERE "passwordHash" IS NOT NULL;


ALTER TABLE "User"
ALTER COLUMN "password" DROP DEFAULT;


-- =========================================================
-- 7. Add Notification isRead
-- =========================================================

ALTER TABLE "Notification"
ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false;


-- Preserve existing read values
UPDATE "Notification"
SET "isRead" = "read"
WHERE "read" IS NOT NULL;


-- =========================================================
-- 8. Add Notification parcelId
-- =========================================================

ALTER TABLE "Notification"
ADD COLUMN "parcelId" INTEGER;


-- =========================================================
-- 9. Create indexes
-- =========================================================

CREATE INDEX "AuditLog_userId_idx"
ON "AuditLog"("userId");

CREATE INDEX "AuditLog_entity_idx"
ON "AuditLog"("entity");

CREATE INDEX "AuditLog_entityId_idx"
ON "AuditLog"("entityId");

CREATE UNIQUE INDEX "Driver_vehicleNumber_key"
ON "Driver"("vehicleNumber");

CREATE INDEX "Notification_userId_idx"
ON "Notification"("userId");

CREATE INDEX "Notification_parcelId_idx"
ON "Notification"("parcelId");

CREATE INDEX "Payment_parcelId_idx"
ON "Payment"("parcelId");

CREATE INDEX "Payment_userId_idx"
ON "Payment"("userId");

CREATE INDEX "Payment_status_idx"
ON "Payment"("status");

CREATE INDEX "Payment_transactionId_idx"
ON "Payment"("transactionId");