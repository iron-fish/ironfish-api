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
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { MS_PER_DAY } from '../common/constants';
import { List } from '../common/interfaces/list';
import { EventsService } from '../events/events.service';
import { CreateUserDto } from './dto/create-user.dto';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { MetricsGranularity } from './enums/metrics-granularity';
import { SerializedUserMetrics } from './interfaces/serialized-user-metrics';
import { UsersService } from './users.service';
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
  ): Promise<User> {
    return this.usersService.findOrThrow(id);
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

    let eventCounts: Record<EventType, number>;
    let points: number;
    const { start, end, granularity } = query;
    if (granularity === MetricsGranularity.LIFETIME) {
      const user = await this.usersService.findOrThrow(id);
      eventCounts = await this.eventsService.getLifetimeEventCountsForUser(
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
      ({ eventCounts, points } =
        await this.eventsService.getTotalEventCountsAndPointsForUser(
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
        blocks_mined: eventCounts[EventType.BLOCK_MINED],
        bugs_caught: eventCounts[EventType.BUG_CAUGHT],
        community_contributions: eventCounts[EventType.COMMUNITY_CONTRIBUTION],
        nodes_hosted: eventCounts[EventType.NODE_HOSTED],
        pull_requests_merged: eventCounts[EventType.PULL_REQUEST_MERGED],
        social_media_contributions:
          eventCounts[EventType.SOCIAL_MEDIA_PROMOTION],
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
    { after, before, limit, order_by, search }: UsersQueryDto,
  ): Promise<List<User>> {
    return {
      data: await this.usersService.list({
        after,
        before,
        limit,
        orderBy: order_by,
        search,
      }),
    };
  }

  @Post()
  @UseGuards(ApiKeyGuard)
  async create(
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { email, graffiti }: CreateUserDto,
  ): Promise<User> {
    return this.usersService.create(email, graffiti);
  }
}
