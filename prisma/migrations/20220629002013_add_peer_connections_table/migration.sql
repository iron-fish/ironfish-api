-- CreateTable
CREATE TABLE "peer_connections" (
    "sourceId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL
);

-- CreateIndex
CREATE INDEX "index_peer_connections_on_timestamp" ON "peer_connections"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "peer_connections_sourceId_destinationId_timestamp_key" ON "peer_connections"("sourceId", "destinationId", "timestamp");
