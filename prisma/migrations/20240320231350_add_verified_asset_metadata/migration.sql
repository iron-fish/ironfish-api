-- CreateTable
CREATE TABLE "VerifiedAssetMetadata" (
    "identifier" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER,
    "logo_uri" TEXT,
    "website" TEXT,

    CONSTRAINT "VerifiedAssetMetadata_pkey" PRIMARY KEY ("identifier")
);

-- AddForeignKey
ALTER TABLE "VerifiedAssetMetadata" ADD CONSTRAINT "VerifiedAssetMetadata_identifier_fkey" FOREIGN KEY ("identifier") REFERENCES "assets"("identifier") ON DELETE CASCADE ON UPDATE CASCADE;
