/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UpsertUserPointsOptions } from './interfaces/upsert-user-points-options';
import { EventType, Prisma, UserPoints } from '.prisma/client';

@Injectable()
export class UserPointsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrThrow(userId: number): Promise<UserPoints> {
    const record = await this.prisma.readClient.userPoints.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!record) {
      throw new NotFoundException();
    }

    return record;
  }

  async upsert(options: UpsertUserPointsOptions): Promise<UserPoints> {
    return this.prisma.$transaction(async (prisma) => {
      return this.upsertWithClient(options, prisma);
    });
  }

  async upsertWithClient(
    { userId, totalPoints, points }: UpsertUserPointsOptions,
    client: BasePrismaClient,
  ): Promise<UserPoints> {
    const options: Prisma.UserPointsUpdateInput = { total_points: totalPoints };
    if (points) {
      const blockMined = points[EventType.BLOCK_MINED];
      const bugCaught = points[EventType.BUG_CAUGHT];
      const communityContribution = points[EventType.COMMUNITY_CONTRIBUTION];
      const pullRequestMerged = points[EventType.PULL_REQUEST_MERGED];
      const socialMediaPromotion = points[EventType.SOCIAL_MEDIA_PROMOTION];
      const nodeUptime = points[EventType.NODE_UPTIME];
      const transactionSent = points[EventType.SEND_TRANSACTION];
      const maspMint = points[EventType.MASP_MINT];
      const maspBurn = points[EventType.MASP_BURN];
      const maspTransfer = points[EventType.MASP_TRANSFER];

      if (blockMined) {
        options.block_mined_last_occurred_at = blockMined.latestOccurredAt;
        options.block_mined_points = blockMined.points;
        options.block_mined_count = blockMined.count;
      }
      if (bugCaught) {
        options.bug_caught_last_occurred_at = bugCaught.latestOccurredAt;
        options.bug_caught_points = bugCaught.points;
        options.bug_caught_count = bugCaught.count;
      }
      if (communityContribution) {
        options.community_contribution_last_occurred_at =
          communityContribution.latestOccurredAt;
        options.community_contribution_points = communityContribution.points;
        options.community_contribution_count = communityContribution.count;
      }
      if (pullRequestMerged) {
        options.pull_request_merged_last_occurred_at =
          pullRequestMerged.latestOccurredAt;
        options.pull_request_merged_points = pullRequestMerged.points;
        options.pull_request_merged_count = pullRequestMerged.count;
      }
      if (socialMediaPromotion) {
        options.social_media_promotion_last_occurred_at =
          socialMediaPromotion.latestOccurredAt;
        options.social_media_promotion_points = socialMediaPromotion.points;
        options.social_media_promotion_count = socialMediaPromotion.count;
      }
      if (nodeUptime) {
        options.node_uptime_last_occurred_at = nodeUptime.latestOccurredAt;
        options.node_uptime_points = nodeUptime.points;
        options.node_uptime_count = nodeUptime.count;
      }
      if (transactionSent) {
        options.send_transaction_last_occurred_at =
          transactionSent.latestOccurredAt;
        options.send_transaction_points = transactionSent.points;
        options.send_transaction_count = transactionSent.count;
      }
      if (maspMint) {
        options.masp_mint_last_occurred_at = maspMint.latestOccurredAt;
        options.masp_mint_points = maspMint.points;
        options.masp_mint_count = maspMint.count;
      }
      if (maspBurn) {
        options.masp_burn_last_occurred_at = maspBurn.latestOccurredAt;
        options.masp_burn_points = maspBurn.points;
        options.masp_burn_count = maspBurn.count;
      }
      if (maspTransfer) {
        options.masp_transfer_last_occurred_at = maspTransfer.latestOccurredAt;
        options.masp_transfer_points = maspTransfer.points;
        options.masp_transfer_count = maspTransfer.count;
      }
    }

    let record = await client.userPoints.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!record) {
      record = await client.userPoints.create({
        data: {
          user_id: userId,
        },
      });
    }

    return client.userPoints.update({
      data: options,
      where: {
        id: record.id,
      },
    });
  }
}
