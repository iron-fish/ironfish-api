/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import is from '@sindresorhus/is';
import { ulid } from 'ulid';
import { ApiConfigService } from '../api-config/api-config.service';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { PostmarkService } from '../postmark/postmark.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersWithRankOptions } from './interfaces/list-by-rank-options';
import { ListUsersOptions } from './interfaces/list-users-options';
import { SerializedUserWithRank } from './interfaces/serialized-user-with-rank';
import { EventType, Prisma, User } from '.prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly postmarkService: PostmarkService,
    private readonly prisma: PrismaService,
  ) {}

  async findOrThrow(id: number): Promise<User> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });
    if (record === null || record.confirmed_at === null) {
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
        confirmed_at: {
          not: null,
        },
      },
    });
  }

  async findOrThrowByGraffiti(graffiti: string): Promise<User> {
    const record = await this.findByGraffiti(graffiti);
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async findOrThrowByEmail(email: string): Promise<User> {
    const record = await this.prisma.user.findFirst({
      where: {
        email,
        confirmed_at: {
          not: null,
        },
      },
    });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByConfirmationToken(token: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        confirmation_token: token,
      },
    });
  }

  async create({
    email,
    graffiti,
    country_code: countryCode,
    discord,
    telegram,
  }: CreateUserDto): Promise<User> {
    const existingRecord = await this.prisma.user.findFirst({
      where: {
        confirmed_at: {
          not: null,
        },
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
    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          email,
          graffiti,
          discord,
          telegram,
          country_code: countryCode,
          confirmation_token: ulid(),
        },
      }),
    ]);
    await this.postmarkService.send({
      alias: 'incentivized-testnet-confirmation',
      templateModel: {
        action_url: `${this.config.get<string>('API_URL')}/registration/${
          user.confirmation_token
        }/confirm`,
        graffiti: user.graffiti,
      },
      to: user.email,
    });
    return user;
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
      confirmed_at: {
        not: null,
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
  }: // eventType,
  ListUsersWithRankOptions): Promise<{
    data: SerializedUserWithRank[];
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    let rankCursor: number;
    const cursorId = before ?? after;
    if (cursorId !== undefined) {
      rankCursor = await this.getRank(cursorId);
    } else {
      // Ranks start at 1, so get everything after 0
      rankCursor = 0;
    }
    const searchFilter = `%${search ?? ''}%`;
    const query = `
      SELECT
        id,
        graffiti,
        total_points,
        country_code,
        last_login_at,
        rank
      FROM
        (
          SELECT
            id,
            graffiti,
            total_points,
            country_code,
            last_login_at,
            RANK () OVER ( 
              ORDER BY 
                total_points DESC,
                COALESCE(latest_event_occurred_at, NOW()) ASC,
                created_at ASC
            ) AS rank 
          FROM
            users
          LEFT JOIN
            (
              SELECT
                user_id,
                MAX(occurred_at) AS latest_event_occurred_at
              FROM
                (
                  SELECT
                    user_id,
                    occurred_at
                  FROM
                    events
                  WHERE
                    deleted_at IS NULL
                ) filtered_events
              GROUP BY
                user_id
            ) user_latest_events
          ON
            user_latest_events.user_id = users.id
          WHERE
            confirmed_at IS NOT NULL
        ) user_ranks
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
        rank ASC
      LIMIT
        $4`;
    const data = await this.prisma.$queryRawUnsafe<SerializedUserWithRank[]>(
      query,
      searchFilter,
      before === undefined,
      rankCursor,
      limit,
      countryCode,
      // eventType,
    );
    return {
      data,
      ...(await this.getListWithRankMetadata(
        data,
        query,
        searchFilter,
        countryCode,
      )),
    };
  }

  async listByEventType({
    after,
    before,
    limit,
    search,
    eventType,
    countryCode,
  }: {
    eventType: EventType;
    search?: string;
    after?: number;
    before?: number;
    limit?: number;
    countryCode?: string;
  }): Promise<{
    data: SerializedUserWithRank[];
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    let rankCursor: number;
    const searchFilter = `%${search ?? ''}%`;
    //eslint-disable-next-line
    console.log(`what is search for? ${searchFilter}`);
    const cursorId = before ?? after;
    if (cursorId !== undefined) {
      rankCursor = await this.getRank(cursorId);
    } else {
      // Ranks start at 1, so get everything after 0
      rankCursor = 0;
    }
    const query = `SELECT
    id,
    created_at,
    updated_at,
    email,
    email_notifications,
    country_code,
    graffiti,
    total_points,
    type AS event_type,
    rank
  FROM (
  SELECT
    users.id,
    users.created_at,
    users.updated_at,
    users.email,
    users.email_notifications,
    users.graffiti,
    users.total_points,
    users.country_code,
    users.last_login_at,
    event_types.type,
    RANK () OVER ( 
      ORDER BY
        COALESCE(latest_event_occurred_at, NOW()) ASC,
        COALESCE(user_event_points.points, 0) DESC,
        users.created_at ASC
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
        SUM(points) AS points,
        MAX(occurred_at) AS latest_event_occurred_at
      FROM
        (
          SELECT
            user_id,
            type,
            points,
            occurred_at
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
  type = $6
AND
  graffiti ILIKE $1 AND
  CASE WHEN $2
    THEN
      rank > $3
    ELSE
      rank < $3
  END
  AND
    CASE WHEN $5::text IS NOT NULL
      THEN
        country_code = $5
      ELSE
        TRUE
    END
  ORDER BY
    rank ASC
  LIMIT
    $4`;
    const data = await this.prisma.$queryRawUnsafe<SerializedUserWithRank[]>(
      query,
      searchFilter,
      before === undefined,
      rankCursor,
      limit,
      countryCode,
      eventType,
    );
    if (
      !is.array(data) ||
      !is.object(data[0]) ||
      !('event_type' in data[0]) ||
      !('rank' in data[0])
    ) {
      throw new Error('Unexpected database response');
    }
    const { length } = data;
    const metadata = { hasNext: false, hasPrevious: false };
    if (length > 0) {
      const previousRecords = await this.prisma.$queryRawUnsafe<
        SerializedUserWithRank[]
      >(
        query,
        searchFilter,
        true,
        data[length - 1].rank,
        1,
        countryCode,
        eventType,
      );
      const nextRecords = await this.prisma.$queryRawUnsafe<
        SerializedUserWithRank[]
      >(query, searchFilter, false, data[0].rank, 1, countryCode, eventType);
      metadata.hasNext = nextRecords.length > 0;
      metadata.hasPrevious = previousRecords.length > 0;
    }
    return {
      data,
      ...metadata,
    };
  }

  private async getListWithRankMetadata(
    data: SerializedUserWithRank[],
    query: string,
    searchFilter: string,
    countryCode?: string,
  ): Promise<{ hasNext: boolean; hasPrevious: boolean }> {
    const { length } = data;
    if (length === 0) {
      return {
        hasNext: false,
        hasPrevious: false,
      };
    }
    const nextRecords = await this.prisma.$queryRawUnsafe<
      SerializedUserWithRank[]
    >(query, searchFilter, true, data[length - 1].rank, 1, countryCode);
    const previousRecords = await this.prisma.$queryRawUnsafe<
      SerializedUserWithRank[]
    >(query, searchFilter, false, data[0].rank, 1, countryCode);
    return {
      hasNext: nextRecords.length > 0,
      hasPrevious: previousRecords.length > 0,
    };
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

  async getRank(userOrId: User | number): Promise<number> {
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
        rank
      FROM
        (
          SELECT
            id,
            RANK () OVER ( 
              ORDER BY 
                total_points DESC,
                COALESCE(latest_event_occurred_at, NOW()) ASC,
                created_at ASC
            ) AS rank 
          FROM
            users
          LEFT JOIN
            (
              SELECT
                user_id,
                MAX(occurred_at) AS latest_event_occurred_at
              FROM
                (
                  SELECT
                    user_id,
                    occurred_at
                  FROM
                    events
                  WHERE
                    deleted_at IS NULL
                ) filtered_events
              GROUP BY
                user_id
            ) user_latest_events
          ON
            user_latest_events.user_id = users.id
          WHERE
            users.confirmed_at IS NOT NULL
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

  async confirm(user: User): Promise<User> {
    return this.prisma.$transaction(async (prisma) => {
      return prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          confirmed_at: new Date().toISOString(),
        },
      });
    });
  }
}
