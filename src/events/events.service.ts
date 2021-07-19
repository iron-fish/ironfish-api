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
    return {
      BLOCK_MINED: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.BLOCK_MINED,
        },
      }),
      BUG_CAUGHT: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.BUG_CAUGHT,
        },
      }),
      COMMUNITY_CONTRIBUTION: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.COMMUNITY_CONTRIBUTION,
        },
      }),
      NODE_HOSTED: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.NODE_HOSTED,
        },
      }),
      PULL_REQUEST_MERGED: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.PULL_REQUEST_MERGED,
        },
      }),
      SOCIAL_MEDIA_PROMOTION: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.SOCIAL_MEDIA_PROMOTION,
        },
      }),
    };
  }

  async getTotalEventCountsForAccount(
    account: Account,
    start: Date,
    end: Date,
  ): Promise<Record<EventType, number>> {
    const { id } = account;
    const dateFilter = {
      occurred_at: {
        gte: start,
        lt: end,
      },
    };
    return {
      BLOCK_MINED: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.BLOCK_MINED,
          ...dateFilter,
        },
      }),
      BUG_CAUGHT: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.BUG_CAUGHT,
          ...dateFilter,
        },
      }),
      COMMUNITY_CONTRIBUTION: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.COMMUNITY_CONTRIBUTION,
          ...dateFilter,
        },
      }),
      NODE_HOSTED: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.NODE_HOSTED,
          ...dateFilter,
        },
      }),
      PULL_REQUEST_MERGED: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.PULL_REQUEST_MERGED,
          ...dateFilter,
        },
      }),
      SOCIAL_MEDIA_PROMOTION: await this.prisma.event.count({
        where: {
          account_id: id,
          type: EventType.SOCIAL_MEDIA_PROMOTION,
          ...dateFilter,
        },
      }),
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
