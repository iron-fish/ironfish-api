/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Deposit, NodeUptime, UserPoints } from '@prisma/client';
import { Job } from 'graphile-worker';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlocksService } from '../blocks/blocks.service';
import { serializedBlockFromRecord } from '../blocks/utils/block-translator';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_POINT_BLOCK_SEQUENCE,
  NODE_UPTIME_CREDIT_HOURS,
  ORE_TO_IRON,
  POINTS_PER_CATEGORY,
  POOL_4_CATEGORIES,
} from '../common/constants';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { RefreshPool4Options } from '../user-points/interfaces/refresh-pool-4-options';
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

export type PointValues = {
  points: number;
  count: number;
  latestOccurredAt: Date | null;
};
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
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const orderBy = {
      occurred_at: Prisma.SortOrder.desc,
    };
    const skip = cursorId ? 1 : 0;
    const where: Prisma.EventWhereInput = {
      user_id: options.userId,
    };

    if (cursorId) {
      if (options.before) {
        where.id = { gte: cursorId };
      } else {
        where.id = { lte: cursorId };
      }
    }

    const records = await this.prisma.readClient.event.findMany({
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

    const nextRecords = await this.prisma.readClient.event.findMany({
      where: {
        ...where,
        id: {
          lt: data[length - 1].id,
        },
      },
      orderBy,
      take: 1,
    });

    const previousRecords = await this.prisma.readClient.event.findMany({
      where: {
        ...where,
        id: {
          gt: data[0].id,
        },
      },
      orderBy,
      take: 1,
    });

    return {
      hasNext: nextRecords.length > 0,
      hasPrevious: previousRecords.length > 0,
    };
  }

  async getUpsertPointsOptions(user: User): Promise<{
    userId: number;
    points: Record<EventType, PointValues>;
    totalPoints: number;
  }> {
    const aggregates: Record<EventType, PointValues> = {
      BLOCK_MINED: await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.BLOCK_MINED,
      ),
      BUG_CAUGHT: await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.BUG_CAUGHT,
      ),
      COMMUNITY_CONTRIBUTION:
        await this.getLifetimePointsAndOccurredAtForUserAndType(
          user,
          EventType.COMMUNITY_CONTRIBUTION,
        ),
      PULL_REQUEST_MERGED:
        await this.getLifetimePointsAndOccurredAtForUserAndType(
          user,
          EventType.PULL_REQUEST_MERGED,
        ),
      SOCIAL_MEDIA_PROMOTION:
        await this.getLifetimePointsAndOccurredAtForUserAndType(
          user,
          EventType.SOCIAL_MEDIA_PROMOTION,
        ),
      NODE_UPTIME: await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.NODE_UPTIME,
      ),
      SEND_TRANSACTION: await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.SEND_TRANSACTION,
      ),
      MULTI_ASSET_MINT: await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.MULTI_ASSET_MINT,
      ),
      MULTI_ASSET_BURN: await this.getLifetimePointsAndOccurredAtForUserAndType(
        user,
        EventType.MULTI_ASSET_BURN,
      ),
      MULTI_ASSET_TRANSFER:
        await this.getLifetimePointsAndOccurredAtForUserAndType(
          user,
          EventType.MULTI_ASSET_TRANSFER,
        ),
      POOL4: { points: 0, count: 0, latestOccurredAt: null },
    };

    const totalPoints = Object.values(aggregates).reduce(
      (memo, curr) => memo + curr.points,
      0,
    );

    aggregates.POOL4 = Object.entries(aggregates).reduce<PointValues>(
      (memo, [eventType, points]) => {
        if (!POOL_4_CATEGORIES.includes(eventType as EventType)) {
          return memo;
        }

        if (!points.latestOccurredAt) {
          return memo;
        }

        if (
          !memo.latestOccurredAt ||
          points.latestOccurredAt > memo.latestOccurredAt
        ) {
          memo.latestOccurredAt = points.latestOccurredAt;
        }

        return {
          points: memo.points + points.points,
          count: memo.count + points.count,
          latestOccurredAt: memo.latestOccurredAt,
        };
      },
      {
        points: 0,
        count: 0,
        latestOccurredAt: null,
      },
    );

    return {
      userId: user.id,
      totalPoints,
      points: aggregates,
    };
  }

  private async getLifetimePointsAndOccurredAtForUserAndType(
    { id }: User,
    type: EventType,
  ): Promise<{
    points: number;
    count: number;
    latestOccurredAt: Date | null;
  }> {
    const aggregate = await this.prisma.event.aggregate({
      _sum: {
        points: true,
      },
      _count: {
        points: true,
      },
      _max: {
        occurred_at: true,
      },
      where: {
        type,
        user_id: id,
      },
    });
    return {
      points: aggregate._sum.points ?? 0,
      count: aggregate._count.points ?? 0,
      latestOccurredAt: aggregate._max.occurred_at,
    };
  }

  getLifetimeEventMetricsForUser(
    points: UserPoints,
  ): Record<EventType, SerializedEventMetrics> {
    return {
      BLOCK_MINED: {
        count: points.block_mined_count,
        points: points.block_mined_points,
      },
      BUG_CAUGHT: {
        count: points.bug_caught_count,
        points: points.bug_caught_points,
      },
      COMMUNITY_CONTRIBUTION: {
        count: points.community_contribution_count,
        points: points.community_contribution_points,
      },
      NODE_UPTIME: {
        count: points.node_uptime_count,
        points: points.node_uptime_points,
      },
      PULL_REQUEST_MERGED: {
        count: points.pull_request_merged_count,
        points: points.pull_request_merged_points,
      },
      SEND_TRANSACTION: {
        count: points.send_transaction_count,
        points: points.send_transaction_points,
      },
      SOCIAL_MEDIA_PROMOTION: {
        count: points.social_media_promotion_count,
        points: points.social_media_promotion_points,
      },
      MULTI_ASSET_BURN: {
        count: points.multi_asset_burn_count,
        points: points.multi_asset_burn_points,
      },
      MULTI_ASSET_MINT: {
        count: points.multi_asset_mint_count,
        points: points.multi_asset_mint_points,
      },
      MULTI_ASSET_TRANSFER: {
        count: points.multi_asset_transfer_count,
        points: points.multi_asset_transfer_points,
      },
      POOL4: {
        count: points.pool4_count,
        points: points.pool4_points,
      },
    };
  }

  private async getEventByUrl(url: string): Promise<Event | null> {
    return this.prisma.event.findFirst({
      where: {
        url,
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
    const pointsAggregate = await this.prisma.readClient.event.aggregate({
      _sum: {
        points: true,
      },
      where: {
        occurred_at: {
          gte: start,
          lt: end,
        },
        user_id: user.id,
      },
    });
    return {
      eventMetrics: {
        BLOCK_MINED: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.BLOCK_MINED,
          start,
          end,
        ),
        BUG_CAUGHT: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.BUG_CAUGHT,
          start,
          end,
        ),
        COMMUNITY_CONTRIBUTION: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.COMMUNITY_CONTRIBUTION,
          start,
          end,
        ),
        PULL_REQUEST_MERGED: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.PULL_REQUEST_MERGED,
          start,
          end,
        ),
        SOCIAL_MEDIA_PROMOTION: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.SOCIAL_MEDIA_PROMOTION,
          start,
          end,
        ),
        NODE_UPTIME: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.NODE_UPTIME,
          start,
          end,
        ),
        SEND_TRANSACTION: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.SEND_TRANSACTION,
          start,
          end,
        ),
        MULTI_ASSET_BURN: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.MULTI_ASSET_BURN,
          start,
          end,
        ),
        MULTI_ASSET_MINT: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.MULTI_ASSET_MINT,
          start,
          end,
        ),
        MULTI_ASSET_TRANSFER: await this.getTotalEventTypeMetricsForUser(
          user,
          EventType.MULTI_ASSET_TRANSFER,
          start,
          end,
        ),
        POOL4: {
          count: null,
          points: null,
          rank: null,
        },
      },
      points: pointsAggregate._sum.points || 0,
    };
  }

  async getTotalEventTypeMetricsForUser(
    { id }: User,
    type: EventType,
    start: Date,
    end: Date,
  ): Promise<SerializedEventMetrics> {
    const dateFilter = {
      occurred_at: {
        gte: start,
        lt: end,
      },
    };
    const aggregate = await this.prisma.readClient.event.aggregate({
      _sum: {
        points: true,
      },
      _count: {
        points: true,
      },
      _max: {
        occurred_at: true,
      },
      where: {
        type,
        user_id: id,
        ...dateFilter,
      },
    });
    return {
      count: aggregate._count.points || 0,
      points: aggregate._sum.points || 0,
      latestOccurredAt: aggregate._max.occurred_at,
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
    occurredAt = occurredAt ? new Date(occurredAt) : new Date();

    const beforeLaunch = occurredAt < PHASE_1_START;
    const afterPhaseOne = occurredAt > PHASE_1_END;

    // Requests to create events and the event timestamp should both be after launch
    const checkEventOccurredAt = this.config.get<boolean>(
      'CHECK_EVENT_OCCURRED_AT',
    );
    if (checkEventOccurredAt && (beforeLaunch || afterPhaseOne)) {
      return null;
    }

    let adjustedPoints;

    if (points != null) {
      adjustedPoints = points;
    } else if (deposit) {
      adjustedPoints = this.calculateDepositPoints(deposit);
    } else {
      adjustedPoints = POINTS_PER_CATEGORY[type];
    }

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

  calculateDepositPoints(deposit: Deposit): number {
    let minDepositSize;
    let maxDepositSize;

    if (deposit.block_sequence < MAX_POINT_BLOCK_SEQUENCE) {
      minDepositSize = 0.1;
      maxDepositSize = 0.1;
    } else {
      minDepositSize = this.config.get<number>('MIN_DEPOSIT_SIZE');
      maxDepositSize = this.config.get<number>('MAX_DEPOSIT_SIZE');
    }

    const minDepositSizeOre = minDepositSize * ORE_TO_IRON;
    const maxDepositSizeOre = maxDepositSize * ORE_TO_IRON;

    const amountCapped = Math.min(deposit.amount, maxDepositSizeOre);
    const numIncrements = Math.floor(amountCapped / minDepositSizeOre);

    return numIncrements * POINTS_PER_CATEGORY[EventType.SEND_TRANSACTION];
  }

  addUpdateLatestPointsJob(userId: number, type: EventType): Promise<Job> {
    const updateLatestPointsQueues = 4;
    const maxJobFrequencyMinutes = 10;

    const queueNumber = Math.floor(Math.random() * updateLatestPointsQueues);
    const runAt = new Date();
    runAt.setMinutes(runAt.getMinutes() + maxJobFrequencyMinutes);

    return this.graphileWorkerService.addJob(
      GraphileWorkerPattern.UPDATE_LATEST_POINTS,
      { userId, type },
      {
        jobKey: `ulp:${userId}:${type}`,
        jobKeyMode: `preserve_run_at`,
        queueName: `update_latest_points_${queueNumber}`,
        runAt,
      },
    );
  }

  async updateLatestPoints(userId: number, type: EventType): Promise<void> {
    const [counts] = await this.prisma.readClient.$queryRawUnsafe<
      {
        count: BigInt;
        points: BigInt;
        total_points: BigInt;
        last_occurred_at: Date;
      }[]
    >(
      `SELECT
        SUM(points) AS total_points,
        SUM(CASE WHEN type = $1::event_type THEN points END) points,
        COUNT(CASE WHEN type = $1::event_type THEN 1 END) AS count,
        MAX(CASE WHEN type = $1::event_type THEN occurred_at END) AS last_occurred_at
      FROM events
      WHERE user_id=$2;`,
      EventType[type as keyof typeof EventType],
      userId,
    );

    await this.userPointsService.upsert({
      userId,
      totalPoints: Number(counts.total_points),
      points: {
        [type]: {
          points: Number(counts.points),
          count: Number(counts.count),
          latestOccurredAt: counts.last_occurred_at,
        },
      },
    });

    if (POOL_4_CATEGORIES.includes(type)) {
      await this.graphileWorkerService.addJob<RefreshPool4Options>(
        GraphileWorkerPattern.REFRESH_POOL_4_POINTS,
        { userId },
        {
          jobKey: `refresh_pool_4:${userId}`,
          queueName: `refresh_pool4`,
        },
      );
    }
  }

  async upsertBlockMined(block: Block, user: User): Promise<Event | null> {
    if (!this.blockMinedEnabled(block.sequence)) {
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
    const record = await prisma.event.delete({
      where: {
        id: event.id,
      },
    });

    await this.addUpdateLatestPointsJob(event.user_id, event.type);

    return record;
  }

  async getLifetimeEventsMetricsForUser(
    user: User,
    events: EventType[],
  ): Promise<SerializedEventMetrics> {
    const rank = await this.getLifetimeEventsRankForUser(user, events);

    return {
      rank: rank.rank,
      points: rank.points,
      count: rank.count,
    };
  }

  async getLifetimeEventsRankForUser(
    user: User,
    events: EventType[],
  ): Promise<{
    points: number | null;
    count: number | null;
    rank: number | null;
  }> {
    const queryPoints = events
      .map((e) => e.toLowerCase() + '_points')
      .join(' + ');
    const queryCounts = events
      .map((e) => e.toLowerCase() + '_count')
      .join(' + ');
    const queryLastOccurredAt = events
      .map((e) => e.toLowerCase() + '_last_occurred_at')
      .join(', ');

    const query = `
      WITH user_ranks AS (
        SELECT
          users.id as user_id,
          ${queryPoints} as points,
          ${queryCounts} as count,
          RANK() OVER (
            ORDER BY
              COALESCE(${queryPoints}, 0) DESC,
              COALESCE(LEAST(${queryLastOccurredAt}), NOW()) ASC,
              users.created_at ASC
          ) as rank
        FROM
          users
        INNER JOIN
          (
            SELECT *
            FROM user_points
            WHERE ${queryPoints} != 0
          ) up
        ON
          up.user_id = users.id
      )

      SELECT
        user_id,
        points,
        count,
        rank::INTEGER
      FROM
        user_ranks
      WHERE
        user_id = $1
      LIMIT
        1;`;

    const rank = await this.prisma.readClient.$queryRawUnsafe<
      {
        points: number;
        count: number;
        rank: number;
      }[]
    >(query, user.id);

    if (rank.length === 0) {
      return {
        rank: null,
        points: null,
        count: null,
      };
    }

    return {
      rank: rank[0].rank,
      points: rank[0].points,
      count: rank[0].count,
    };
  }

  async createNodeUptimeEventWithClient(
    user: User,
    occurredAt: Date,
    uptime: NodeUptime,
    client: BasePrismaClient,
  ): Promise<number> {
    const count = Math.floor(uptime.total_hours / NODE_UPTIME_CREDIT_HOURS);

    const payloads = [];

    for (let i = 0; i < count; ++i) {
      payloads.push({
        occurred_at: occurredAt.toISOString(),
        points: POINTS_PER_CATEGORY[EventType.NODE_UPTIME],
        type: EventType.NODE_UPTIME,
        user_id: user.id,
      });
    }

    const created = await client.event.createMany({
      data: payloads,
    });

    return created.count;
  }

  /**
   * https://ironfish.network/blog/2022/03/07/incentivized-testnet-roadmap
   */
  blockMinedEnabled(sequence: number): boolean {
    const endOfPhaseOneSequence = 150000;
    const allowBlockMinedPoints = this.config.get<boolean>(
      'ALLOW_BLOCK_MINED_POINTS',
    );

    return allowBlockMinedPoints && sequence <= endOfPhaseOneSequence;
  }
}
