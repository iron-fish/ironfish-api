/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import is from '@sindresorhus/is';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { standardizeEmail } from '../common/utils/email';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersWithRankOptions } from './interfaces/list-by-rank-options';
import { ListUsersOptions } from './interfaces/list-users-options';
import { SerializedUserWithRank } from './interfaces/serialized-user-with-rank';
import { UpdateUserOptions } from './interfaces/update-user-options';
import { EventType, Prisma, User } from '.prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPointsService: UserPointsService,
  ) {}

  async find(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findOrThrow(id: number): Promise<User> {
    const record = await this.find(id);
    if (record === null) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByGraffiti(
    graffiti: string,
    prisma?: BasePrismaClient,
  ): Promise<User | null> {
    const client = prisma ?? this.prisma;
    return client.user.findFirst({
      where: {
        graffiti,
      },
    });
  }

  async findManyAndMapByGraffiti(
    graffiti: string[],
  ): Promise<Map<string, User>> {
    const unique = Array.from(new Set(graffiti));

    const users = await this.prisma.user.findMany({
      where: {
        graffiti: {
          in: unique,
        },
      },
    });

    const results = new Map<string, User>();
    for (const user of users) {
      results.set(user.graffiti, user);
    }

    return results;
  }

  async findByGraffitiOrThrow(graffiti: string): Promise<User> {
    const record = await this.findByGraffiti(graffiti);
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByEmailOrThrow(email: string): Promise<User> {
    const record = await this.findByEmail(email);
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByEmail(email: string): Promise<User | null> {
    email = standardizeEmail(email);
    return this.prisma.user.findFirst({
      where: {
        email,
      },
    });
  }

  async listByEmail(email: string): Promise<User[]> {
    email = standardizeEmail(email);
    return this.prisma.user.findMany({
      where: {
        email,
      },
    });
  }

  async create({
    email,
    graffiti,
    country_code: countryCode,
    discord,
    telegram,
    github,
  }: CreateUserDto): Promise<User> {
    email = standardizeEmail(email);
    const existingRecord = await this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email,
          },
          {
            graffiti,
          },
        ],
      },
    });
    if (existingRecord) {
      throw new UnprocessableEntityException(
        `User already exists for '${
          graffiti === existingRecord.graffiti ? graffiti : email
        }'`,
      );
    }
    return this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email,
          graffiti,
          discord,
          telegram,
          github,
          country_code: countryCode,
        },
      });
      await this.userPointsService.upsertWithClient(
        { userId: user.id },
        prisma,
      );
      return user;
    });
  }

  async list(options: ListUsersOptions): Promise<{
    data: User[];
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const orderBy = { id: SortOrder.DESC };
    const skip = cursor ? 1 : 0;
    const where = {
      country_code: options.countryCode,
      graffiti: {
        contains: options.search,
      },
    };
    const data = await this.prisma.user.findMany({
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
    data: User[],
    where: Prisma.UserWhereInput,
    orderBy: Prisma.Enumerable<Prisma.UserOrderByWithRelationInput>,
  ): Promise<{ hasNext: boolean; hasPrevious: boolean }> {
    const { length } = data;
    if (length === 0) {
      return {
        hasNext: false,
        hasPrevious: false,
      };
    }
    const nextRecords = await this.prisma.user.findMany({
      where,
      orderBy,
      cursor: { id: data[length - 1].id },
      skip: 1,
      take: 1,
    });
    const previousRecords = await this.prisma.user.findMany({
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

  async listWithRank({
    after,
    before,
    limit,
    search,
    countryCode,
    eventType,
  }: ListUsersWithRankOptions): Promise<{
    data: SerializedUserWithRank[];
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    let rankCursor: number;
    const cursorId = before ?? after;
    if (cursorId !== undefined) {
      rankCursor = await this.getRank(cursorId, eventType);
    } else {
      // Ranks start at 1, so get everything after 0
      rankCursor = 0;
    }

    const searchFilter = `%${search ?? ''}%`;
    const totalPointsAt = this.totalPointsAtForUserPoints(eventType);

    const query = `
      WITH 
        user_latest_events AS (
          SELECT
            user_id,
            ${totalPointsAt} AS total_points,
            ${this.latestEventOccurredAtForUserPoints(
              eventType,
            )} AS latest_event_occurred_at
          FROM
            user_points
          ${search ? '' : 'WHERE ' + totalPointsAt + ' != 0'}
        ),
        user_ranks as (
          SELECT
            id,
            graffiti,
            total_points,
            country_code,
            created_at,
            RANK () OVER (
              ORDER BY
                total_points DESC,
                COALESCE(latest_event_occurred_at, NOW()) ASC,
                created_at ASC
            ) AS rank
          FROM
            users
          INNER JOIN
            user_latest_events
          ON
            user_latest_events.user_id = users.id
        )

      SELECT
        id,
        graffiti,
        total_points,
        country_code,
        created_at,
        rank::INTEGER
      FROM
        user_ranks
      WHERE
        graffiti ILIKE $1 AND
        CASE WHEN $2
          THEN
            rank > $3
          ELSE
            rank < $3
        END AND
        CASE WHEN $5::text IS NOT NULL
          THEN
            country_code = $5
          ELSE
            TRUE
        END
      ORDER BY
        CASE WHEN $2
          THEN
            rank
          ELSE
            -rank
        END ASC
      LIMIT
        $4`;

    const data = await this.prisma.$queryRawUnsafe<SerializedUserWithRank[]>(
      query,
      searchFilter,
      before === undefined,
      rankCursor,
      limit,
      countryCode,
    );

    // If fetching a previous page, the ranks are sorted in opposite order.
    // Reverse the data so the returned chunk is in ascending order.
    if (before !== undefined) {
      data.reverse();
    }

    if (data.length === 0) {
      return {
        data: [],
        hasNext: false,
        hasPrevious: false,
      };
    }

    const nextRecords = await this.prisma.$queryRawUnsafe<
      SerializedUserWithRank[]
    >(query, searchFilter, true, data[data.length - 1].rank, 1, countryCode);

    const previousRecords = await this.prisma.$queryRawUnsafe<
      SerializedUserWithRank[]
    >(query, searchFilter, false, data[0].rank, 1, countryCode);

    return {
      data: data,
      hasNext: nextRecords.length > 0,
      hasPrevious: previousRecords.length > 0,
    };
  }

  private totalPointsAtForUserPoints(type?: EventType): string {
    if (!type) {
      return 'total_points';
    }
    switch (type) {
      case EventType.BLOCK_MINED:
        return 'block_mined_points';
      case EventType.BUG_CAUGHT:
        return 'bug_caught_points';
      case EventType.COMMUNITY_CONTRIBUTION:
        return 'community_contribution_points';
      case EventType.NODE_UPTIME:
        return 'node_uptime_points';
      case EventType.PULL_REQUEST_MERGED:
        return 'pull_request_merged_points';
      case EventType.SEND_TRANSACTION:
        return 'send_transaction_points';
      case EventType.SOCIAL_MEDIA_PROMOTION:
        return 'social_media_promotion_points';
      case EventType.MULTI_ASSET_BURN:
        return 'multi_asset_burn_points';
      case EventType.MULTI_ASSET_MINT:
        return 'multi_asset_mint_points';
      case EventType.MULTI_ASSET_TRANSFER:
        return 'multi_asset_transfer_points';
    }
  }

  private latestEventOccurredAtForUserPoints(type?: EventType): string {
    if (!type) {
      return `
        GREATEST(
          block_mined_last_occurred_at,
          bug_caught_last_occurred_at,
          community_contribution_last_occurred_at,
          node_uptime_last_occurred_at,
          pull_request_merged_last_occurred_at,
          send_transaction_last_occurred_at,
          social_media_promotion_last_occurred_at
        )`;
    }
    switch (type) {
      case EventType.BLOCK_MINED:
        return 'block_mined_last_occurred_at';
      case EventType.BUG_CAUGHT:
        return 'bug_caught_last_occurred_at';
      case EventType.COMMUNITY_CONTRIBUTION:
        return 'community_contribution_last_occurred_at';
      case EventType.NODE_UPTIME:
        return 'node_uptime_last_occurred_at';
      case EventType.PULL_REQUEST_MERGED:
        return 'pull_request_merged_last_occurred_at';
      case EventType.SEND_TRANSACTION:
        return 'send_transaction_last_occurred_at';
      case EventType.SOCIAL_MEDIA_PROMOTION:
        return 'social_media_promotion_last_occurred_at';
      case EventType.MULTI_ASSET_BURN:
        return 'multi_asset_burn_last_occurred_at';
      case EventType.MULTI_ASSET_MINT:
        return 'multi_asset_mint_last_occurred_at';
      case EventType.MULTI_ASSET_TRANSFER:
        return 'multi_asset_transfer_last_occurred_at';
    }
  }

  async updateLastLoginAt(user: User): Promise<User> {
    return this.prisma.$transaction(async (prisma) => {
      return prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          last_login_at: new Date().toISOString(),
        },
      });
    });
  }

  async getRank(
    userOrId: User | number,
    eventType?: EventType,
  ): Promise<number> {
    let id: number;
    if (typeof userOrId === 'number') {
      const record = await this.findOrThrow(userOrId);
      id = record.id;
    } else {
      id = userOrId.id;
    }
    const rankResponse = await this.prisma.$queryRawUnsafe<{ rank: number }[]>(
      `SELECT
        id,
        rank::INTEGER
      FROM
        (
          SELECT
            users.id,
            RANK () OVER (
              ORDER BY
                ${this.totalPointsAtForUserPoints(eventType)} DESC,
                COALESCE(
                  ${this.latestEventOccurredAtForUserPoints(eventType)}, 
                  NOW()
                ) ASC,
                users.created_at ASC
            ) AS rank
          FROM
            users
          JOIN
            user_points
          ON
            user_points.user_id = users.id
        ) user_ranks
      WHERE
        id = $1`,
      id,
    );
    if (
      !is.array(rankResponse) ||
      rankResponse.length !== 1 ||
      !is.object(rankResponse[0]) ||
      !('id' in rankResponse[0]) ||
      !('rank' in rankResponse[0])
    ) {
      throw new Error('Unexpected database response');
    }
    return rankResponse[0].rank;
  }

  async findDuplicateUser(
    user: User,
    options: UpdateUserOptions,
    client: BasePrismaClient,
  ): Promise<User[]> {
    const { discord, github, graffiti, telegram } = options;

    const filters = [];
    if (discord) {
      filters.push({ discord });
    }
    if (github) {
      filters.push({ github });
    }
    if (graffiti) {
      filters.push({ graffiti });
    }
    if (telegram) {
      filters.push({ telegram });
    }

    return client.user.findMany({
      where: {
        OR: filters,
        NOT: {
          id: user.id,
        },
      },
    });
  }

  async update(
    user: User,
    options: UpdateUserOptions,
    client: BasePrismaClient,
  ): Promise<User> {
    const { countryCode, discord, github, graffiti, telegram } = options;
    return client.user.update({
      data: {
        country_code: countryCode,
        discord,
        github,
        graffiti,
        telegram,
      },
      where: {
        id: user.id,
      },
    });
  }
}
