/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT, MS_PER_DAY } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { List } from '../common/interfaces/list';
import { EventsService } from '../events/events.service';
import { SerializedEventMetrics } from '../events/interfaces/serialized-event-metrics';
import { CreateUserDto } from './dto/create-user.dto';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { MetricsGranularity } from './enums/metrics-granularity';
import { SerializedUser } from './interfaces/serialized-user';
import { SerializedUserMetrics } from './interfaces/serialized-user-metrics';
import { SerializedUserWithRank } from './interfaces/serialized-user-with-rank';
import { UsersService } from './users.service';
import {
  serializedUserFromRecord,
  serializedUserFromRecordWithRank,
} from './utils/user-translator';
import { EventType, User } from '.prisma/client';

const MAX_SUPPORTED_TIME_RANGE_IN_DAYS = 30;

@Controller('users')
export class UsersController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  @Get(':id')
  async find(
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: number,
  ): Promise<SerializedUser> {
    const user = await this.usersService.findOrThrow(id);
    return serializedUserFromRecordWithRank(
      user,
      await this.usersService.getRank(user),
    );
  }

  @Get(':id/metrics')
  async metrics(
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: number,
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    query: MetricsQueryDto,
  ): Promise<SerializedUserMetrics> {
    const { isValid, error } = this.isValidMetricsQuery(query);
    if (!isValid) {
      throw new UnprocessableEntityException(error);
    }

    let eventMetrics: Record<EventType, SerializedEventMetrics>;
    let points: number;
    const { start, end, granularity } = query;
    if (granularity === MetricsGranularity.LIFETIME) {
      const user = await this.usersService.findOrThrow(id);
      eventMetrics = await this.eventsService.getLifetimeEventMetricsForUser(
        user,
      );
      points = user.total_points;
    } else {
      if (start === undefined || end === undefined) {
        throw new UnprocessableEntityException(
          'Must provide time range for "TOTAL" requests',
        );
      }
      const user = await this.usersService.findOrThrow(id);
      ({ eventMetrics, points } =
        await this.eventsService.getTotalEventMetricsAndPointsForUser(
          user,
          start,
          end,
        ));
    }

    return {
      user_id: id,
      granularity,
      points,
      metrics: {
        blocks_mined: eventMetrics[EventType.BLOCK_MINED],
        bugs_caught: eventMetrics[EventType.BUG_CAUGHT],
        community_contributions: eventMetrics[EventType.COMMUNITY_CONTRIBUTION],
        pull_requests_merged: eventMetrics[EventType.PULL_REQUEST_MERGED],
        social_media_contributions:
          eventMetrics[EventType.SOCIAL_MEDIA_PROMOTION],
      },
    };
  }

  private isValidMetricsQuery({ start, end, granularity }: MetricsQueryDto): {
    isValid: boolean;
    error?: string;
  } {
    if (start !== undefined && end !== undefined) {
      if (granularity === MetricsGranularity.LIFETIME) {
        return {
          isValid: false,
          error: 'Cannot provide time range for "LIFETIME" requests',
        };
      }
      if (start >= end) {
        return {
          isValid: false,
          error: '"start" must be stricly less than "end"',
        };
      }

      const diffInMs = end.getTime() - start.getTime();
      const diffInDays = diffInMs / MS_PER_DAY;
      if (diffInDays > MAX_SUPPORTED_TIME_RANGE_IN_DAYS) {
        return {
          isValid: false,
          error: 'Time range too long',
        };
      }
    }
    return { isValid: true };
  }

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { after, before, limit, order_by: orderBy, search }: UsersQueryDto,
  ): Promise<List<SerializedUser | SerializedUserWithRank>> {
    if (orderBy !== undefined) {
      const backwards = before !== undefined;
      const cursorId = before ?? after;
      // This is the reverse order than most other endpoints since rank strictly
      // increases and we sort by most recently created elsewhere by default
      const order = backwards ? SortOrder.DESC : SortOrder.ASC;
      return {
        data: await this.usersService.listWithRank({
          order,
          limit: Math.min(MAX_LIMIT, limit || DEFAULT_LIMIT),
          cursorId,
          search,
        }),
      };
    }
    const users = await this.usersService.list({
      after,
      before,
      limit,
      search,
    });
    return {
      data: users.map((user) => serializedUserFromRecord(user)),
    };
  }

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    dto: CreateUserDto,
  ): Promise<User> {
    return this.usersService.create(dto);
  }
}
