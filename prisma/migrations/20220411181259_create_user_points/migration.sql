-- CreateTable
CREATE TABLE "user_points" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "block_mined_points" INTEGER NOT NULL DEFAULT 0,
    "block_mined_last_occurred_at" TIMESTAMP(6),
    "bug_caught_points" INTEGER NOT NULL DEFAULT 0,
    "bug_caught_last_occurred_at" TIMESTAMP(6),
    "community_contribution_points" INTEGER NOT NULL DEFAULT 0,
    "community_contribution_last_occurred_at" TIMESTAMP(6),
    "pull_request_merged_points" INTEGER NOT NULL DEFAULT 0,
    "pull_request_merged_last_occurred_at" TIMESTAMP(6),
    "social_media_promotion_points" INTEGER NOT NULL DEFAULT 0,
    "social_media_promotion_last_occurred_at" TIMESTAMP(6),

    CONSTRAINT "user_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_points_user_id_key" ON "user_points"("user_id");

-- CreateIndex
CREATE INDEX "index_user_points_on_user_id" ON "user_points"("user_id");

-- CreateIndex
CREATE INDEX "index_user_points_on_block_mined" ON "user_points"("block_mined_points");

-- CreateIndex
CREATE INDEX "index_user_points_on_bug_caught" ON "user_points"("bug_caught_points");

-- CreateIndex
CREATE INDEX "index_user_points_on_community_contribution" ON "user_points"("community_contribution_points");

-- CreateIndex
CREATE INDEX "index_user_points_on_pull_request_merged" ON "user_points"("pull_request_merged_points");

-- CreateIndex
CREATE INDEX "index_user_points_on_social_media_promotion" ON "user_points"("social_media_promotion_points");

-- AddForeignKey
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
