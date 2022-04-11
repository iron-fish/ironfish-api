import { Prisma, EventType, UserPoints } from ".prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertUserPointsOptions } from "./interfaces/upsert-user-points-options";

@Injectable()
export class UserPointsService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async upsert({
    userId,
    points
  }: UpsertUserPointsOptions): Promise<UserPoints> {
    return this.prisma.$transaction(async (prisma) => {
      const blockMined = points.get(EventType.BLOCK_MINED)
      const bugCaught = points.get(EventType.BUG_CAUGHT)
      const communityContribution = points.get(EventType.COMMUNITY_CONTRIBUTION)
      const pullRequestMerged = points.get(EventType.PULL_REQUEST_MERGED)
      const socialMediaPromotion = points.get(EventType.SOCIAL_MEDIA_PROMOTION)
      const updateOptions: Prisma.UserPointsUpdateInput = {}
      if (blockMined) {
        updateOptions.block_mined_last_occurred_at = blockMined.latest_occurred_at
        updateOptions.block_mined_points = blockMined.points
      }
      if (bugCaught) {
        updateOptions.bug_caught_last_occurred_at = bugCaught.latest_occurred_at
        updateOptions.bug_caught_points = bugCaught.points
      }
      if (communityContribution) {
        updateOptions.community_contribution_last_occurred_at = communityContribution.latest_occurred_at
        updateOptions.community_contribution_points = communityContribution.points
      }
      if (pullRequestMerged) {
        updateOptions.pull_request_merged_last_occurred_at = pullRequestMerged.latest_occurred_at
        updateOptions.pull_request_merged_points = pullRequestMerged.points
      }
      if (socialMediaPromotion) {
        updateOptions.social_media_promotion_last_occurred_at = socialMediaPromotion.latest_occurred_at
        updateOptions.social_media_promotion_points = socialMediaPromotion.points
      }

      let existingRecord = await prisma.userPoints.findUnique({
        where: {
          user_id: userId
        }
      })
      if (!existingRecord) {
        existingRecord = await prisma.userPoints.create({
          data: {
            user_id: userId
          }
        })
      }
      return existingRecord
    });
  }
}
