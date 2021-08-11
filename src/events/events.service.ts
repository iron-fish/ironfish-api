/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  WEEKLY_POINT_LIMITS_BY_EVENT_TYPE,
} from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { getMondayFromDate } from '../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventOptions } from './interfaces/create-event-options';
import { ListEventsOptions } from './interfaces/list-events-options';
import { Block, Event, EventType, User } from '.prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async list(options: ListEventsOptions): Promise<Event[]> {
    const backwards = options.before !== undefined;
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const limit = Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const order = backwards ? SortOrder.ASC : SortOrder.DESC;
    const skip = cursor ? 1 : 0;
    return this.prisma.event.findMany({
      cursor,
      orderBy: {
        id: order,
      },
      skip,
      take: limit,
      where: {
        user_id: options.userId,
        deleted_at: null,
      },
    });
  }

  async getLifetimeEventCountsForUser(
    user: User,
  ): Promise<Record<EventType, number>> {
    const { id } = user;
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
          user_id: id,
          type: EventType.BLOCK_MINED,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
          type: EventType.BUG_CAUGHT,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
          type: EventType.COMMUNITY_CONTRIBUTION,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
          type: EventType.NODE_HOSTED,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
          type: EventType.PULL_REQUEST_MERGED,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
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

  async getTotalEventCountsAndPointsForUser(
    user: User,
    start: Date,
    end: Date,
  ): Promise<{ eventCounts: Record<EventType, number>; points: number }> {
    const { id } = user;
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
          user_id: id,
          type: EventType.BLOCK_MINED,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
          type: EventType.BUG_CAUGHT,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
          type: EventType.COMMUNITY_CONTRIBUTION,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
          type: EventType.NODE_HOSTED,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
          type: EventType.PULL_REQUEST_MERGED,
          ...dateFilter,
        },
      }),
      this.prisma.event.count({
        where: {
          user_id: id,
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

  async create({
    blockId,
    occurredAt,
    points = 0,
    type,
    userId,
  }: CreateEventOptions): Promise<Event> {
    const weeklyLimitForEventType = WEEKLY_POINT_LIMITS_BY_EVENT_TYPE[type];
    const startOfWeek = getMondayFromDate(occurredAt);
    const pointsAggregateThisWeek = await this.prisma.event.aggregate({
      _sum: {
        points: true,
      },
      where: {
        type,
        user_id: userId,
        occurred_at: {
          gte: startOfWeek,
        },
      },
    });
    const pointsThisWeek = pointsAggregateThisWeek._sum.points || 0;
    const adjustedPoints = Math.min(
      Math.max(weeklyLimitForEventType - pointsThisWeek, 0),
      points,
    );

    const [_, event] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          total_points: {
            increment: adjustedPoints,
          },
        },
      }),
      this.prisma.event.create({
        data: {
          type,
          block_id: blockId,
          points: adjustedPoints,
          occurred_at: (occurredAt || new Date()).toISOString(),
          user_id: userId,
        },
      }),
    ]);
    return event;
  }

  async upsertBlockMined(block: Block, user: User): Promise<Event> {
    const points = 10;
    const record = await this.prisma.event.findUnique({
      where: {
        block_id: block.id,
      },
    });
    if (record) {
      return record;
    }
    return this.create({
      blockId: block.id,
      occurredAt: block.timestamp,
      type: EventType.BLOCK_MINED,
      userId: user.id,
      points,
    });
  }

  async deleteBlockMined(block: Block, user: User): Promise<Event | null> {
    let event = await this.prisma.event.findUnique({
      where: {
        block_id: block.id,
      },
    });
    if (event) {
      [, event] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            total_points: {
              decrement: event.points,
            },
          },
        }),
        this.prisma.event.update({
          data: {
            deleted_at: new Date().toISOString(),
            points: 0,
          },
          where: {
            block_id: block.id,
          },
        }),
      ]);
    }
    return event;
  }
}
