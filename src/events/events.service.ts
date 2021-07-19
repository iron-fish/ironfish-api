/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { ListEventsOptions } from './interfaces/list-events-options';
import { Account, Event, EventType, Prisma } from '.prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async find(input: Prisma.EventWhereUniqueInput): Promise<Event | null> {
    return this.prisma.event.findUnique({
      where: input,
    });
  }

  async list(options: ListEventsOptions): Promise<Event[]> {
    const backwards = options.before !== undefined;
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const limit = Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const order = backwards ? 'desc' : 'asc';
    const skip = cursor ? 1 : 0;
    return this.prisma.event.findMany({
      cursor,
      orderBy: {
        id: order,
      },
      skip,
      take: limit,
      where: {
        account_id: options.accountId,
      },
    });
  }

  async getLifetimeEventCountsForAccount(
    account: Account,
  ): Promise<Record<EventType, number>> {
    const { id } = account;
    const [
      blocksMined,
      bugsCaught,
      communityContributions,
      nodesHosted,
      pullRequestsMerged,
      socialMediaPromotions,
    ] = await this.prisma.$transaction([
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.BLOCK_MINED,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.BUG_CAUGHT,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.COMMUNITY_CONTRIBUTION,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.NODE_HOSTED,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.PULL_REQUEST_MERGED,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.SOCIAL_MEDIA_PROMOTION,
        },
      }),
    ]);
    return {
      BLOCK_MINED: blocksMined,
      BUG_CAUGHT: bugsCaught,
      COMMUNITY_CONTRIBUTION: communityContributions,
      NODE_HOSTED: nodesHosted,
      PULL_REQUEST_MERGED: pullRequestsMerged,
      SOCIAL_MEDIA_PROMOTION: socialMediaPromotions,
    };
  }

  async getTotalEventCountsAndPointsForAccount(
    account: Account,
    start: Date,
    end: Date,
  ): Promise<{ eventCounts: Record<EventType, number>; points: number }> {
    const { id } = account;
    const dateFilter = {
      occurred_at: {
        gte: start,
        lt: end,
      },
    };
    const [
      blocksMined,
      bugsCaught,
      communityContributions,
      nodesHosted,
      pullRequestsMerged,
      socialMediaPromotions,
      pointsAggregate,
    ] = await this.prisma.$transaction([
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.BLOCK_MINED,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.BUG_CAUGHT,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.COMMUNITY_CONTRIBUTION,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.NODE_HOSTED,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.PULL_REQUEST_MERGED,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.SOCIAL_MEDIA_PROMOTION,
          ...dateFilter,
        },
      }),
      this.prisma.event.aggregate({
        _sum: {
          points: true,
        },
        where: {
          ...dateFilter,
        },
      }),
    ]);

    return {
      eventCounts: {
        BLOCK_MINED: blocksMined,
        BUG_CAUGHT: bugsCaught,
        COMMUNITY_CONTRIBUTION: communityContributions,
        NODE_HOSTED: nodesHosted,
        PULL_REQUEST_MERGED: pullRequestsMerged,
        SOCIAL_MEDIA_PROMOTION: socialMediaPromotions,
      },
      points: pointsAggregate._sum.points ?? 0,
    };
  }

  async create(type: EventType, account: Account, points = 0): Promise<Event> {
    const [_, event] = await this.prisma.$transaction([
      this.prisma.account.update({
        where: {
          id: account.id,
        },
        data: {
          total_points: {
            increment: points,
          },
        },
      }),
      this.prisma.event.create({
        data: {
          type,
          points,
          occurred_at: new Date(),
          account_id: account.id,
        },
      }),
    ]);
    return event;
  }
}
