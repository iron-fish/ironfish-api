/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import is from '@sindresorhus/is';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersWithRankOptions } from '../users/interfaces/list-by-rank-options';
import { SerializedUserWithRank } from '../users/interfaces/serialized-user-with-rank';
import { UsersService } from '../users/users.service';
import { EventType } from '.prisma/client';

@Injectable()
export class UserRanksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async updateRanks(): Promise<void> {
    for (const eventType of [...Object.keys(EventType), 'total_points']) {
      await this.prisma.$executeRawUnsafe(
        `REFRESH MATERIALIZED VIEW ${eventType}_user_ranks;`,
      );
    }
  }

  async getRank(
    userId: number,
    eventType: EventType | 'total_points',
  ): Promise<number> {
    const user = await this.usersService.findOrThrow(userId);
    const rankResponse = await this.prisma.$queryRawUnsafe<
      { id: number; rank: number }[]
    >(
      `SELECT
          id,
          rank::INTEGER
       FROM 
          ${eventType + '_user_ranks'}
       WHERE
          id = $1`,
      user.id,
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
      rankCursor = await this.getRank(cursorId, eventType ?? 'total_points');
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
        created_at,
        rank::INTEGER
      FROM
        ${eventType ? eventType + '_user_ranks' : 'total_points_user_ranks'}
      WHERE
        ${search ? '' : 'total_points != 0 AND'}
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

  async getLifetimeEventsRankForUser(
    userId: number,
    eventType: EventType,
  ): Promise<{
    points: number | null;
    count: number | null;
    rank: number | null;
  }> {
    const query = `
      SELECT
        id,
        total_points as points,
        total_counts as count,
        rank::INTEGER
      FROM
        ${eventType + '_user_ranks'}
      WHERE
        id = $1
      LIMIT
        1;`;

    const rank = await this.prisma.readClient.$queryRawUnsafe<
      {
        points: number;
        count: number;
        rank: number;
      }[]
    >(query, userId);

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
}
