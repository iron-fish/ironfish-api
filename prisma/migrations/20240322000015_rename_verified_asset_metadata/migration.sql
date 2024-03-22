/*
  Warnings:

  - You are about to drop the `VerifiedAssetMetadata` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VerifiedAssetMetadata" DROP CONSTRAINT "VerifiedAssetMetadata_identifier_fkey";

-- DropTable
DROP TABLE "VerifiedAssetMetadata";

-- CreateTable
CREATE TABLE "verified_asset_metadata" (
    "identifier" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER,
    "logo_uri" TEXT,
    "website" TEXT,

    CONSTRAINT "verified_asset_metadata_pkey" PRIMARY KEY ("identifier")
);

-- AddForeignKey
ALTER TABLE "verified_asset_metadata" ADD CONSTRAINT "verified_asset_metadata_identifier_fkey" FOREIGN KEY ("identifier") REFERENCES "assets"("identifier") ON DELETE CASCADE ON UPDATE CASCADE;
