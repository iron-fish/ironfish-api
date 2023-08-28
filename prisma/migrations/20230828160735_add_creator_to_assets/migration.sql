-- Create new column which is a nullable text field
ALTER TABLE "assets" ADD COLUMN     "creator" TEXT;

-- Populate the new column with data
UPDATE "assets" SET "creator" = "owner";

-- Alter the new column to be not-nullable
ALTER TABLE "assets" ALTER COLUMN "creator" SET NOT NULL;
