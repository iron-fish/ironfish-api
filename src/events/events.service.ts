/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import is from '@sindresorhus/is';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  POINTS_PER_CATEGORY,
  WEEKLY_POINT_LIMITS_BY_EVENT_TYPE,
} from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { getMondayFromDate } from '../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { CreateEventOptions } from './interfaces/create-event-options';
import { ListEventsOptions } from './interfaces/list-events-options';
import { SerializedEventMetrics } from './interfaces/serialized-event-metrics';
import { Block, Event, EventType, Prisma, User } from '.prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async list(options: ListEventsOptions): Promise<{
    data: Event[];
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const orderBy = {
      id: SortOrder.DESC,
    };
    const skip = cursor ? 1 : 0;
    const where = {
      user_id: options.userId,
      deleted_at: null,
    };
    const data = await this.prisma.event.findMany({
      cursor,
      orderBy,
      skip,
      take: limit,
      where,
    });
    return {
      data,
      ...(await this.getListMetadata(data, where, orderBy)),
    };
  }

  private async getListMetadata(
    data: Event[],
    where: Prisma.EventWhereInput,
    orderBy: Prisma.Enumerable<Prisma.EventOrderByWithRelationInput>,
  ): Promise<{ hasNext: boolean; hasPrevious: boolean }> {
    const { length } = data;
    if (length === 0) {
      return {
        hasNext: false,
        hasPrevious: false,
      };
    }
    const nextRecords = await this.prisma.event.findMany({
      where,
      orderBy,
      cursor: { id: data[length - 1].id },
      skip: 1,
      take: 1,
    });
    const previousRecords = await this.prisma.event.findMany({
      where,
      orderBy,
      cursor: { id: data[0].id },
      skip: 1,
      take: -1,
    });
    return {
      hasNext: nextRecords.length > 0,
      hasPrevious: previousRecords.length > 0,
    };
  }

  async getLifetimeEventMetricsForUser(
    user: User,
  ): Promise<Record<EventType, SerializedEventMetrics>> {
    return this.prisma.$transaction(async (prisma) => {
      const ranks = await this.getRanksForEventTypes(user, prisma);
      return {
        BLOCK_MINED: await this.getLifetimeEventTypeMetricsForUser(
          user,
          EventType.BLOCK_MINED,
          ranks,
          prisma,
        ),
        BUG_CAUGHT: await this.getLifetimeEventTypeMetricsForUser(
          user,
          EventType.BUG_CAUGHT,
          ranks,
          prisma,
        ),
        COMMUNITY_CONTRIBUTION: await this.getLifetimeEventTypeMetricsForUser(
          user,
          EventType.COMMUNITY_CONTRIBUTION,
          ranks,
          prisma,
        ),
        PULL_REQUEST_MERGED: await this.getLifetimeEventTypeMetricsForUser(
          user,
          EventType.PULL_REQUEST_MERGED,
          ranks,
          prisma,
        ),
        SOCIAL_MEDIA_PROMOTION: await this.getLifetimeEventTypeMetricsForUser(
          user,
          EventType.SOCIAL_MEDIA_PROMOTION,
          ranks,
          prisma,
        ),
      };
    });
  }

  private async getLifetimeEventTypeMetricsForUser(
    { id }: User,
    type: EventType,
    ranks: Record<EventType, number>,
    client: BasePrismaClient,
  ): Promise<SerializedEventMetrics> {
    const aggregate = await client.event.aggregate({
      _sum: {
        points: true,
      },
      where: {
        type,
        user_id: id,
        deleted_at: null,
      },
    });
    return {
      count: await client.event.count({
        where: {
          type,
          user_id: id,
          deleted_at: null,
        },
      }),
      points: aggregate._sum.points || 0,
      rank: ranks[type],
    };
  }

  async getTotalEventMetricsAndPointsForUser(
    user: User,
    start: Date,
    end: Date,
  ): Promise<{
    eventMetrics: Record<EventType, SerializedEventMetrics>;
    points: number;
  }> {
    return this.prisma.$transaction(async (prisma) => {
      const pointsAggregate = await prisma.event.aggregate({
        _sum: {
          points: true,
        },
        where: {
          occurred_at: {
            gte: start,
            lt: end,
          },
          user_id: user.id,
          deleted_at: null,
        },
      });
      return {
        eventMetrics: {
          BLOCK_MINED: await this.getTotalEventTypeMetricsForUser(
            user,
            EventType.BLOCK_MINED,
            start,
            end,
            prisma,
          ),
          BUG_CAUGHT: await this.getTotalEventTypeMetricsForUser(
            user,
            EventType.BUG_CAUGHT,
            start,
            end,
            prisma,
          ),
          COMMUNITY_CONTRIBUTION: await this.getTotalEventTypeMetricsForUser(
            user,
            EventType.COMMUNITY_CONTRIBUTION,
            start,
            end,
            prisma,
          ),
          PULL_REQUEST_MERGED: await this.getTotalEventTypeMetricsForUser(
            user,
            EventType.PULL_REQUEST_MERGED,
            start,
            end,
            prisma,
          ),
          SOCIAL_MEDIA_PROMOTION: await this.getTotalEventTypeMetricsForUser(
            user,
            EventType.SOCIAL_MEDIA_PROMOTION,
            start,
            end,
            prisma,
          ),
        },
        points: pointsAggregate._sum.points || 0,
      };
    });
  }

  private async getTotalEventTypeMetricsForUser(
    { id }: User,
    type: EventType,
    start: Date,
    end: Date,
    client: BasePrismaClient,
  ): Promise<SerializedEventMetrics> {
    const dateFilter = {
      occurred_at: {
        gte: start,
        lt: end,
      },
    };
    const aggregate = await client.event.aggregate({
      _sum: {
        points: true,
      },
      where: {
        type,
        user_id: id,
        deleted_at: null,
        ...dateFilter,
      },
    });
    return {
      count: await client.event.count({
        where: {
          type,
          user_id: id,
          deleted_at: null,
          ...dateFilter,
        },
      }),
      points: aggregate._sum.points || 0,
    };
  }

  async create(options: CreateEventOptions): Promise<Event> {
    return this.prisma.$transaction(async (prisma) => {
      return this.createWithClient(options, prisma);
    });
  }

  async createWithClient(
    { blockId, occurredAt, points, type, userId }: CreateEventOptions,
    client: BasePrismaClient,
  ): Promise<Event> {
    const weeklyLimitForEventType = WEEKLY_POINT_LIMITS_BY_EVENT_TYPE[type];
    const startOfWeek = getMondayFromDate(occurredAt);
    const pointsAggregateThisWeek = await client.event.aggregate({
      _sum: {
        points: true,
      },
      where: {
        type,
        user_id: userId,
        deleted_at: null,
        occurred_at: {
          gte: startOfWeek,
        },
      },
    });
    const pointsThisWeek = pointsAggregateThisWeek._sum.points || 0;
    const adjustedPoints = Math.min(
      Math.max(weeklyLimitForEventType - pointsThisWeek, 0),
      points ?? POINTS_PER_CATEGORY[type],
    );

    await client.user.update({
      where: {
        id: userId,
      },
      data: {
        total_points: {
          increment: adjustedPoints,
        },
      },
    });
    return client.event.create({
      data: {
        type,
        block_id: blockId,
        points: adjustedPoints,
        occurred_at: (occurredAt || new Date()).toISOString(),
        user_id: userId,
      },
    });
  }

  async upsertBlockMined(
    block: Block,
    user: User,
    client: BasePrismaClient,
  ): Promise<Event> {
    const points = POINTS_PER_CATEGORY[EventType.BLOCK_MINED];
    const record = await client.event.findUnique({
      where: {
        block_id: block.id,
      },
    });
    if (record) {
      return record;
    }
    return this.createWithClient(
      {
        blockId: block.id,
        occurredAt: block.timestamp,
        type: EventType.BLOCK_MINED,
        userId: user.id,
        points,
      },
      client,
    );
  }

  async deleteBlockMined(
    block: Block,
    user: User,
    client: BasePrismaClient,
  ): Promise<Event | null> {
    const event = await client.event.findUnique({
      where: {
        block_id: block.id,
      },
    });
    if (event) {
      await client.user.update({
        where: {
          id: user.id,
        },
        data: {
          total_points: {
            decrement: event.points,
          },
        },
      });
      return client.event.update({
        data: {
          deleted_at: new Date().toISOString(),
          points: 0,
        },
        where: {
          block_id: block.id,
        },
      });
    }
    return event;
  }

  async getRanksForEventTypes(
    user: User,
    client: BasePrismaClient,
  ): Promise<Record<EventType, number>> {
    const userRanks = await client.$queryRawUnsafe<
      {
        type: EventType;
        rank: number;
      }[]
    >(
      `SELECT
        id,
        type,
        rank
      FROM
        (
          SELECT
            users.id,
            event_types.type,
            RANK () OVER ( 
              PARTITION BY event_types.type
              ORDER BY COALESCE(user_event_points.points, 0) DESC, users.created_at ASC
            ) AS rank 
          FROM
            users
          CROSS JOIN
            (
              SELECT
                UNNEST(ENUM_RANGE(NULL::event_type)) AS type
            ) event_types
          LEFT JOIN
            (
              SELECT
                user_id,
                type,
                SUM(points) AS points
              FROM
                (
                  SELECT
                    user_id,
                    type,
                    points
                  FROM
                    events
                  WHERE
                    deleted_at IS NULL
                ) filtered_events
              GROUP BY
                user_id,
                type
            ) user_event_points
          ON
            user_event_points.type = event_types.type AND
            user_event_points.user_id = users.id
        ) user_ranks
      WHERE
        id = $1`,
      user.id,
    );
    if (
      !is.array(userRanks) ||
      !is.object(userRanks[0]) ||
      !('type' in userRanks[0]) ||
      !('rank' in userRanks[0])
    ) {
      throw new Error('Unexpected database response');
    }
    const getRankForType = (type: EventType) => {
      const userRankForEvent = userRanks.find((o) => o.type === type);
      if (!userRankForEvent) {
        throw new Error(
          `Missing rank for user '${user.id}' and type '${type}'`,
        );
      }
      return userRankForEvent.rank;
    };
    return {
      [EventType.BLOCK_MINED]: getRankForType(EventType.BLOCK_MINED),
      [EventType.BUG_CAUGHT]: getRankForType(EventType.BUG_CAUGHT),
      [EventType.COMMUNITY_CONTRIBUTION]: getRankForType(
        EventType.COMMUNITY_CONTRIBUTION,
      ),
      [EventType.PULL_REQUEST_MERGED]: getRankForType(
        EventType.PULL_REQUEST_MERGED,
      ),
      [EventType.SOCIAL_MEDIA_PROMOTION]: getRankForType(
        EventType.SOCIAL_MEDIA_PROMOTION,
      ),
    };
  }
}
