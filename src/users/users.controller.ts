/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { MagicLinkGuard } from '../auth/guards/magic-link.guard';
import { DEFAULT_LIMIT, MAX_LIMIT, MS_PER_DAY } from '../common/constants';
import { Context } from '../common/decorators/context';
import { MetricsGranularity } from '../common/enums/metrics-granularity';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { EventsService } from '../events/events.service';
import { SerializedEventMetrics } from '../events/interfaces/serialized-event-metrics';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMetricsQueryDto } from './dto/user-metrics-query.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { SerializedUser } from './interfaces/serialized-user';
import { SerializedUserMetrics } from './interfaces/serialized-user-metrics';
import { SerializedUserWithRank } from './interfaces/serialized-user-with-rank';
import { UsersService } from './users.service';
import { UsersUpdater } from './users-updater';
import {
  serializedUserFromRecord,
  serializedUserFromRecordWithRank,
} from './utils/user-translator';
import { EventType, User } from '.prisma/client';

const MAX_SUPPORTED_TIME_RANGE_IN_DAYS = 30;

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
    private readonly usersUpdater: UsersUpdater,
  ) {}

  @ApiOperation({ summary: 'Gets a specific User' })
  @ApiParam({ description: 'Unique User identifier', name: 'id' })
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

  @ApiOperation({ summary: 'Gets metrics for a specific User' })
  @ApiParam({ description: 'Unique User identifier', name: 'id' })
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
    query: UserMetricsQueryDto,
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

  private isValidMetricsQuery({
    start,
    end,
    granularity,
  }: UserMetricsQueryDto): {
    isValid: boolean;
    error?: string;
  } {
    if (
      granularity !== MetricsGranularity.LIFETIME &&
      granularity !== MetricsGranularity.TOTAL
    ) {
      return {
        isValid: false,
        error: '"granularity" must be "lifetime" or "total"',
      };
    }

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

  @ApiOperation({ summary: 'Returns a paginated list of users' })
  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    {
      after,
      before,
      limit,
      order_by: orderBy,
      country_code: countryCode,
      event_type: eventType,
      search,
    }: UsersQueryDto,
  ): Promise<PaginatedList<SerializedUser | SerializedUserWithRank>> {
    if (orderBy !== undefined) {
      const { data, hasNext, hasPrevious } =
        await this.usersService.listWithRank({
          after,
          before,
          limit: Math.min(MAX_LIMIT, limit || DEFAULT_LIMIT),
          search,
          countryCode,
          eventType,
        });
      return {
        object: 'list',
        data,
        metadata: {
          has_next: hasNext,
          has_previous: hasPrevious,
        },
      };
    }
    const { data, hasNext, hasPrevious } = await this.usersService.list({
      after,
      before,
      limit,
      search,
      countryCode,
      eventType,
    });
    return {
      object: 'list',
      data: data.map((user) => serializedUserFromRecord(user)),
      metadata: {
        has_next: hasNext,
        has_previous: hasPrevious,
      },
    };
  }

  @ApiExcludeEndpoint()
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

  @ApiExcludeEndpoint()
  @Put(':id')
  @UseGuards(MagicLinkGuard)
  async update(
    @Context() { user }: MagicLinkContext,
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: number,
    @Body(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    dto: UpdateUserDto,
  ): Promise<User> {
    if (id !== user.id) {
      throw new ForbiddenException();
    }
    return this.usersUpdater.update(user, {
      countryCode: dto.country_code,
      discord: dto.discord,
      graffiti: dto.graffiti,
      telegram: dto.telegram,
    });
  }
}
