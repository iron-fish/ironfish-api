-- CreateTable
CREATE TABLE "versions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" VARCHAR NOT NULL,

    CONSTRAINT "versions_pkey" PRIMARY KEY ("id")
);
