/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import is from '@sindresorhus/is';
import { Job } from 'graphile-worker';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlocksService } from '../blocks/blocks.service';
import { serializedBlockFromRecord } from '../blocks/utils/block-translator';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  POINTS_PER_CATEGORY,
  WEEKLY_POINT_LIMITS_BY_EVENT_TYPE,
} from '../common/constants';
import { getMondayFromDate } from '../common/utils/date';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';
import { DepositsService } from './deposits.service';
import { CreateEventOptions } from './interfaces/create-event-options';
import { EventWithMetadata } from './interfaces/event-with-metadata';
import { ListEventsOptions } from './interfaces/list-events-options';
import { SerializedEventMetrics } from './interfaces/serialized-event-metrics';
import { Block, Event, EventType, Prisma, User } from '.prisma/client';

// 2021 December 1 8 PM UTC
const PHASE_1_START = new Date(Date.UTC(2021, 11, 1, 20, 0, 0));
// 2022 March 12 8 PM UTC
const PHASE_1_END = new Date(Date.UTC(2022, 2, 12, 20, 0, 0));

@Injectable()
export class EventsService {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
    private readonly userPointsService: UserPointsService,
    private readonly depositsService: DepositsService,
    private readonly graphileWorkerService: GraphileWorkerService,
  ) {}

  async findOrThrow(id: number): Promise<Event> {
    const record = await this.prisma.event.findUnique({
      where: {
        id,
      },
    });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async list(options: ListEventsOptions): Promise<{
    data: EventWithMetadata[];
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const orderBy = {
      occurred_at: Prisma.SortOrder.desc,
    };
    const skip = cursor ? 1 : 0;
    const where = {
      user_id: options.userId,
      deleted_at: null,
    };
    const records = await this.prisma.event.findMany({
      cursor,
      orderBy,
      skip,
      take: limit,
      where,
    });
    return {
      data: await this.enrichEventsWithMetadata(records),
      ...(await this.getListMetadata(records, where, orderBy)),
    };
  }

  private async enrichEventsWithMetadata(
    records: Event[],
  ): Promise<EventWithMetadata[]> {
    const data = [];
    for (const record of records) {
      let metadata = {};
      if (record.block_id) {
        const block = await this.blocksService.find(record.block_id);
        if (!block) {
          throw new Error('Invalid database response');
        }
        metadata = serializedBlockFromRecord(block);
      }
      if (record.url) {
        metadata = { ...metadata, url: record.url };
      }
      if (record.deposit_id) {
        const deposit = await this.depositsService.findOrThrow(
          record.deposit_id,
        );

        metadata = {
          transaction_hash: deposit.transaction_hash,
          block_hash: deposit.block_hash,
        };
      }
      data.push({
        ...record,
        metadata,
      });
    }
    return data;
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

  async getUpsertPointsOptions(user: User): Promise<{
    userId: number;
    points: Record<
      EventType,
      { points: number; latestOccurredAt: Date | null }
    >;
    totalPoints: number;
  }> {
    const blockMinedAggregate =
      await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.BLOCK_MINED,
      );
    const bugCaughtAggregate =
      await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.BUG_CAUGHT,
      );
    const communityContributionAggregate =
      await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.COMMUNITY_CONTRIBUTION,
      );
    const pullRequestAggregate =
      await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.PULL_REQUEST_MERGED,
      );
    const socialMediaAggregate =
      await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.SOCIAL_MEDIA_PROMOTION,
      );
    const nodeUptimeAggregate =
      await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.NODE_UPTIME,
      );
    const sendTransactionAggregate =
      await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.SEND_TRANSACTION,
      );
    const totalPoints =
      blockMinedAggregate.points +
      bugCaughtAggregate.points +
      communityContributionAggregate.points +
      pullRequestAggregate.points +
      socialMediaAggregate.points;

    return {
      userId: user.id,
      totalPoints,
      points: {
        BLOCK_MINED: blockMinedAggregate,
        BUG_CAUGHT: bugCaughtAggregate,
        COMMUNITY_CONTRIBUTION: communityContributionAggregate,
        PULL_REQUEST_MERGED: pullRequestAggregate,
        SOCIAL_MEDIA_PROMOTION: socialMediaAggregate,
        NODE_UPTIME: nodeUptimeAggregate,
        SEND_TRANSACTION: sendTransactionAggregate,
      },
    };
  }

  private async getLifetimePointsAndOccurredAtForUserAndType(
    { id }: User,
    type: EventType,
  ): Promise<{
    points: number;
    latestOccurredAt: Date | null;
  }> {
    const aggregate = await this.prisma.event.aggregate({
      _sum: {
        points: true,
      },
      _max: {
        occurred_at: true,
      },
      where: {
        type,
        user_id: id,
        deleted_at: null,
      },
    });
    return {
      points: aggregate._sum.points ?? 0,
      latestOccurredAt: aggregate._max.occurred_at,
    };
  }

  async getLifetimeEventMetricsForUser(
    user: User,
  ): Promise<Record<EventType, SerializedEventMetrics>> {
    const ranks = await this.getRanksForEventTypes(user);

    return {
      BLOCK_MINED: await this.getLifetimeEventTypeMetricsForUser(
        user,
        EventType.BLOCK_MINED,
        ranks,
      ),
      BUG_CAUGHT: await this.getLifetimeEventTypeMetricsForUser(
        user,
        EventType.BUG_CAUGHT,
        ranks,
      ),
      COMMUNITY_CONTRIBUTION: await this.getLifetimeEventTypeMetricsForUser(
        user,
        EventType.COMMUNITY_CONTRIBUTION,
        ranks,
      ),
      PULL_REQUEST_MERGED: await this.getLifetimeEventTypeMetricsForUser(
        user,
        EventType.PULL_REQUEST_MERGED,
        ranks,
      ),
      SOCIAL_MEDIA_PROMOTION: await this.getLifetimeEventTypeMetricsForUser(
        user,
        EventType.SOCIAL_MEDIA_PROMOTION,
        ranks,
      ),
      NODE_UPTIME: await this.getLifetimeEventTypeMetricsForUser(
        user,
        EventType.NODE_UPTIME,
        ranks,
      ),
      SEND_TRANSACTION: await this.getLifetimeEventTypeMetricsForUser(
        user,
        EventType.SEND_TRANSACTION,
        ranks,
      ),
    };
  }

  private async getLifetimeEventTypeMetricsForUser(
    { id }: User,
    type: EventType,
    ranks: Record<EventType, number>,
  ): Promise<SerializedEventMetrics> {
    const aggregate = await this.prisma.event.aggregate({
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
      count: await this.prisma.event.count({
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

  private async getEventByUrl(url: string): Promise<Event | null> {
    return this.prisma.event.findFirst({
      where: {
        url,
        deleted_at: null,
      },
    });
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
          NODE_UPTIME: await this.getTotalEventTypeMetricsForUser(
            user,
            EventType.NODE_UPTIME,
            start,
            end,
            prisma,
          ),
          SEND_TRANSACTION: await this.getTotalEventTypeMetricsForUser(
            user,
            EventType.SEND_TRANSACTION,
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

  async create(options: CreateEventOptions): Promise<EventWithMetadata | null> {
    return this.prisma.$transaction(async (prisma) => {
      return this.createWithClient(options, prisma);
    });
  }

  async createWithClient(
    {
      blockId,
      occurredAt,
      points,
      type,
      userId,
      url,
      deposit,
    }: CreateEventOptions,
    client: BasePrismaClient,
  ): Promise<EventWithMetadata | null> {
    occurredAt = occurredAt || new Date();

    const beforeLaunch = occurredAt < PHASE_1_START;
    const afterPhaseOne = occurredAt > PHASE_1_END;

    // Requests to create events and the event timestamp should both be after launch
    const checkEventOccurredAt = this.config.get<boolean>(
      'CHECK_EVENT_OCCURRED_AT',
    );
    if (checkEventOccurredAt && (beforeLaunch || afterPhaseOne)) {
      return null;
    }

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
          lt: occurredAt,
          gte: startOfWeek,
        },
      },
    });

    const pointsThisWeek = pointsAggregateThisWeek._sum.points || 0;
    const weeklyLimitForEventType = WEEKLY_POINT_LIMITS_BY_EVENT_TYPE[type];
    const adjustedPoints = Math.min(
      Math.max(weeklyLimitForEventType - pointsThisWeek, 0),
      points ?? POINTS_PER_CATEGORY[type],
    );

    let metadata = {};
    let existingEvent;
    if (url) {
      metadata = { ...metadata, url };
      existingEvent = await this.getEventByUrl(url);
    } else if (blockId) {
      existingEvent = await client.event.findUnique({
        where: {
          block_id: blockId,
        },
      });

      const block = await this.blocksService.find(blockId);
      if (!block) {
        throw new Error('Invalid database response');
      }
      metadata = serializedBlockFromRecord(block);
    } else if (deposit) {
      existingEvent = await client.event.findUnique({
        where: {
          deposit_id: deposit.id,
        },
      });

      metadata = {
        block_hash: deposit.block_hash,
        transaction_hash: deposit.transaction_hash,
      };
    }

    if (existingEvent) {
      const pointDifference = adjustedPoints - existingEvent.points;

      // Only update event points if necessary
      if (pointDifference !== 0) {
        existingEvent = await client.event.update({
          data: {
            points: adjustedPoints,
          },
          where: {
            id: existingEvent.id,
          },
        });
      }
    } else {
      existingEvent = await client.event.create({
        data: {
          type,
          block_id: blockId,
          points: adjustedPoints,
          occurred_at: occurredAt.toISOString(),
          user_id: userId,
          url,
          deposit_id: deposit?.id,
        },
      });
    }

    await this.addUpdateLatestPointsJob(userId, type);

    return {
      ...existingEvent,
      metadata,
    };
  }

  private addUpdateLatestPointsJob(
    userId: number,
    type: EventType,
  ): Promise<Job> {
    return this.graphileWorkerService.addJob(
      GraphileWorkerPattern.UPDATE_LATEST_POINTS,
      { userId, type },
      {
        jobKey: `ulp:${userId}:${type}`,
      },
    );
  }

  async updateLatestPoints(userId: number, type: EventType): Promise<void> {
    await this.prisma.$transaction(async (client) => {
      const occurredAtAggregate = await client.event.aggregate({
        _max: {
          occurred_at: true,
        },
        where: {
          type,
          user_id: userId,
          deleted_at: null,
        },
      });
      const latestOccurredAt = occurredAtAggregate._max.occurred_at;

      const pointsAggregate = await client.event.aggregate({
        _sum: {
          points: true,
        },
        where: {
          type,
          user_id: userId,
          deleted_at: null,
        },
      });
      const points = pointsAggregate._sum.points ?? 0;

      const totalPointsAggregate = await client.event.aggregate({
        _sum: {
          points: true,
        },
        where: {
          user_id: userId,
          deleted_at: null,
        },
      });
      const totalPoints = totalPointsAggregate._sum.points ?? 0;

      await this.userPointsService.upsertWithClient(
        {
          userId,
          points: { [type]: { points, latestOccurredAt } },
          totalPoints,
        },
        client,
      );
    });
  }

  async upsertBlockMined(block: Block, user: User): Promise<Event | null> {
    // https://ironfish.network/blog/2022/03/07/incentivized-testnet-roadmap
    const endOfPhaseOneSequence = 150000;
    const allowBlockMinedPoints = this.config.get<boolean>(
      'ALLOW_BLOCK_MINED_POINTS',
    );

    if (!allowBlockMinedPoints || block.sequence > endOfPhaseOneSequence) {
      return null;
    }
    return this.create({
      blockId: block.id,
      occurredAt: block.timestamp,
      type: EventType.BLOCK_MINED,
      userId: user.id,
      points: POINTS_PER_CATEGORY[EventType.BLOCK_MINED],
    });
  }

  async deleteBlockMined(block: Block): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({
      where: {
        block_id: block.id,
      },
    });
    if (event) {
      return this.delete(event);
    }
    return event;
  }

  async delete(event: Event): Promise<Event> {
    return this.prisma.$transaction(async (prisma) => {
      return this.deleteWithClient(event, prisma);
    });
  }

  async deleteWithClient(
    event: Event,
    prisma: BasePrismaClient,
  ): Promise<Event> {
    const updated = await prisma.event.update({
      data: {
        deleted_at: new Date().toISOString(),
        points: 0,
      },
      where: {
        id: event.id,
      },
    });

    await this.addUpdateLatestPointsJob(event.user_id, event.type);

    return updated;
  }

  async getLifetimeEventsMetricsForUser(
    user: User,
    events: EventType[],
  ): Promise<SerializedEventMetrics> {
    const rank = await this.getLifetimeEventsRankForUser(user, events);

    const count = await this.prisma.event.count({
      where: {
        type: {
          in: events,
        },
        user_id: user.id,
        deleted_at: null,
      },
    });

    return {
      rank: rank.rank,
      points: rank.points,
      count: count,
    };
  }

  async getLifetimeEventsRankForUser(
    user: User,
    events: EventType[],
  ): Promise<{ points: number; rank: number }> {
    const queryPoints = events
      .map((e) => e.toLowerCase() + '_points')
      .join(' + ');

    const queryLastOccurredAt = events
      .map((e) => e.toLowerCase() + '_last_occurred_at')
      .join(', ');

    const query = `
      WITH user_ranks AS (
        SELECT
          users.id as user_id,
          ${queryPoints} as points,
          RANK() OVER (
            ORDER BY
              COALESCE(${queryPoints}, 0) DESC,
              COALESCE(LEAST(${queryLastOccurredAt}), NOW()) ASC,
              users.created_at ASC
          ) as rank
        FROM
          users
        LEFT JOIN
          user_points
        ON
          user_points.user_id = users.id
      )

      SELECT
        user_id,
        points,
        rank
      FROM
        user_ranks
      WHERE
        user_id = $1
      LIMIT
        1;`;

    const rank = await this.prisma.$queryRawUnsafe<
      {
        points: number;
        rank: number;
      }[]
    >(query, user.id);

    if (rank.length === 0) {
      throw new Error(`User ${user.id} has no user_points entry`);
    }

    return {
      rank: rank[0].rank,
      points: rank[0].points,
    };
  }

  async getRanksForEventTypes(user: User): Promise<Record<EventType, number>> {
    const userRanks = await this.prisma.$queryRawUnsafe<
      {
        type: EventType;
        rank: number;
      }[]
    >(
      `WITH
        event_types as (
          SELECT
            UNNEST(ENUM_RANGE(NULL::event_type)) AS type
        ),
        filtered_events as (
          SELECT
            user_id,
            type,
            occurred_at,
            points
          FROM
            events
          WHERE
            points != 0 AND
            deleted_at IS NULL
        ),
        user_event_points as (
          SELECT
            user_id,
            type,
            SUM(points) AS points,
            MAX(occurred_at) AS latest_event_occurred_at
          FROM
            filtered_events
          GROUP BY
            user_id,
            type
        ),
        user_ranks as (
          SELECT
            users.id,
            event_types.type,
            RANK () OVER (
              PARTITION BY event_types.type
              ORDER BY
                COALESCE(user_event_points.points, 0) DESC,
                COALESCE(user_event_points.latest_event_occurred_at, NOW()) ASC,
                users.created_at ASC
            ) AS rank
          FROM
            users
          CROSS JOIN
            event_types
          LEFT JOIN
            user_event_points
          ON
            user_event_points.type = event_types.type AND
            user_event_points.user_id = users.id
        )

      SELECT
        id,
        type,
        rank
      FROM
        user_ranks
      WHERE
        id = $1;`,
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
      [EventType.NODE_UPTIME]: getRankForType(EventType.NODE_UPTIME),
      [EventType.SEND_TRANSACTION]: getRankForType(EventType.SEND_TRANSACTION),
    };
  }

  async createNodeUptimeEventWithClient(
    user: User,
    client: BasePrismaClient,
  ): Promise<Event | null> {
    return this.createWithClient(
      {
        occurredAt: new Date(),
        type: EventType.NODE_UPTIME,
        userId: user.id,
        points: POINTS_PER_CATEGORY[EventType.NODE_UPTIME],
      },
      client,
    );
  }
}
