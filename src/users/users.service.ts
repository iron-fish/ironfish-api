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
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersOptions } from './interfaces/list-users-options';
import { SerializedUserWithRank } from './interfaces/serialized-user-with-rank';
import { User } from '.prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrThrow(id: number): Promise<User> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });
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
        last_login_at: {
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

  async create({
    email,
    graffiti,
    country_code: countryCode,
    discord,
    telegram,
  }: CreateUserDto): Promise<User> {
    const existingRecord = await this.prisma.user.findFirst({
      where: {
        last_login_at: {
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
        },
      }),
    ]);
    return user;
  }

  async list(options: ListUsersOptions): Promise<User[]> {
    const backwards = options.before !== undefined;
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const limit = Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const order = backwards ? SortOrder.ASC : SortOrder.DESC;
    const skip = cursor ? 1 : 0;
    return this.prisma.user.findMany({
      cursor,
      orderBy: { id: order },
      skip,
      take: limit,
      where: {
        graffiti: {
          contains: options.search,
        },
      },
    });
  }

  async listByRank(
    order: SortOrder,
    limit: number,
    cursorId?: number,
  ): Promise<SerializedUserWithRank[]> {
    let rankCursor: number;
    if (cursorId !== undefined) {
      rankCursor = await this.getRank(cursorId);
    } else if (order === SortOrder.DESC) {
      // Ranks start at 1, so get everything before |users| + 1
      rankCursor = (await this.prisma.user.count()) + 1;
    } else {
      // Ranks start at 1, so get everything after 0
      rankCursor = 0;
    }
    return this.prisma.$queryRaw<SerializedUserWithRank[]>(
      `SELECT
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
        ) user_ranks
      WHERE
        CASE WHEN $1
          THEN
            rank > $2
          ELSE
            rank < $2
        END
      ORDER BY
        CASE WHEN $1
          THEN
            rank
          ELSE
            rank * -1
        END ASC
      LIMIT
        $3`,
      order === SortOrder.ASC,
      rankCursor,
      limit,
    );
  }

  async updateLastLoginAtByEmail(email: string): Promise<User> {
    return this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.findFirst({
        where: {
          email,
        },
        orderBy: {
          // This does not guarantee we choose the right user
          created_at: SortOrder.DESC,
        },
      });
      if (!user) {
        throw new NotFoundException();
      }
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
    const rankResponse = await this.prisma.$queryRaw<{ rank: number }[]>(
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
}
