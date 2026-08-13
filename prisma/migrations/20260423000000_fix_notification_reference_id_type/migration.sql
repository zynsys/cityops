-- AlterTable: change notification.reference_id from uuid to varchar(100)
-- This allows storing both UUID references and integer report IDs (e.g. "64")
ALTER TABLE "notification" ALTER COLUMN "reference_id" TYPE VARCHAR(100) USING "reference_id"::text;
