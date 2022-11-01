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
import { MetricsPool } from '../common/enums/metrics-pool';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { IntIsSafeForPrismaPipe } from '../common/pipes/int-is-safe-for-prisma.pipe';
import { EventsService } from '../events/events.service';
import { SerializedEventMetrics } from '../events/interfaces/serialized-event-metrics';
import { NodeUptimesService } from '../node-uptimes/node-uptimes.service';
import { UserPointsService } from '../user-points/user-points.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMetricsQueryDto } from './dto/user-metrics-query.dto';
import { UserQueryDto } from './dto/user-query.dto';
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
    private readonly nodeUptimeService: NodeUptimesService,
    private readonly userPointsService: UserPointsService,
    private readonly usersService: UsersService,
    private readonly usersUpdater: UsersUpdater,
  ) {}

  @ApiOperation({ summary: `Gets a specific User by 'graffiti'` })
  @Get('find')
  async find(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { graffiti, with_rank }: UserQueryDto,
  ): Promise<SerializedUser | SerializedUserWithRank> {
    const user = await this.usersService.findByGraffitiOrThrow(graffiti);
    const userPoints = await this.userPointsService.findOrThrow(user.id);

    if (with_rank) {
      return serializedUserFromRecordWithRank(
        user,
        userPoints,
        await this.usersService.getRank(user),
      );
    } else {
      return serializedUserFromRecord(user, userPoints);
    }
  }

  @ApiOperation({ summary: 'Gets a specific User' })
  @ApiParam({ description: 'Unique User identifier', name: 'id' })
  @Get(':id')
  async get(
    @Param('id', new IntIsSafeForPrismaPipe())
    id: number,
  ): Promise<SerializedUserWithRank> {
    const user = await this.usersService.findOrThrow(id);
    const userPoints = await this.userPointsService.findOrThrow(user.id);
    return serializedUserFromRecordWithRank(
      user,
      userPoints,
      await this.usersService.getRank(user),
    );
  }

  @ApiOperation({ summary: 'Gets metrics for a specific User' })
  @ApiParam({ description: 'Unique User identifier', name: 'id' })
  @Get(':id/metrics')
  async metrics(
    @Param('id', new IntIsSafeForPrismaPipe())
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

    const user = await this.usersService.findOrThrow(id);

    let eventMetrics: Record<EventType, SerializedEventMetrics>;
    let points: number;
    let pools: Record<MetricsPool, SerializedEventMetrics> | undefined;
    let nodeUptime: SerializedUserMetrics['node_uptime'];

    if (query.granularity === MetricsGranularity.LIFETIME) {
      const bugCaughtRankPromise =
        this.eventsService.getLifetimeEventsRankForUser(user, [
          EventType.BUG_CAUGHT,
        ]);

      const pullRequestRankPromise =
        this.eventsService.getLifetimeEventsRankForUser(user, [
          EventType.PULL_REQUEST_MERGED,
        ]);

      const nodeUptimeRankPromise =
        this.eventsService.getLifetimeEventsRankForUser(user, [
          EventType.NODE_UPTIME,
        ]);

      const sendTransactionRankPromise =
        this.eventsService.getLifetimeEventsRankForUser(user, [
          EventType.SEND_TRANSACTION,
        ]);

      const mainRankPromise =
        await this.eventsService.getLifetimeEventsRankForUser(user, [
          EventType.BUG_CAUGHT,
          EventType.NODE_UPTIME,
          EventType.SEND_TRANSACTION,
        ]);

      const codeRanksPromise =
        await this.eventsService.getLifetimeEventsRankForUser(user, [
          EventType.PULL_REQUEST_MERGED,
        ]);

      const [
        bugCaughtRank,
        pullRequestRank,
        nodeUptimeRank,
        sendTransactionRank,
        codeRank,
        mainRank,
      ] = await Promise.all([
        bugCaughtRankPromise,
        pullRequestRankPromise,
        nodeUptimeRankPromise,
        sendTransactionRankPromise,
        codeRanksPromise,
        mainRankPromise,
      ]);

      const empty = { count: 0, points: 0, rank: 0 };

      eventMetrics = {
        BUG_CAUGHT: bugCaughtRank,
        PULL_REQUEST_MERGED: pullRequestRank,
        NODE_UPTIME: nodeUptimeRank,
        SEND_TRANSACTION: sendTransactionRank,
        BLOCK_MINED: empty,
        COMMUNITY_CONTRIBUTION: empty,
        SOCIAL_MEDIA_PROMOTION: empty,
      };

      pools = {
        main: mainRank,
        code: codeRank,
      };

      points =
        bugCaughtRank.points +
        pullRequestRank.points +
        nodeUptimeRank.points +
        sendTransactionRank.points;

      const uptime = await this.nodeUptimeService.get(user);
      nodeUptime = {
        total_hours: uptime?.total_hours ?? 0,
        last_checked_in: uptime?.last_checked_in?.toISOString() ?? null,
      };
    } else {
      if (query.start === undefined || query.end === undefined) {
        throw new UnprocessableEntityException(
          'Must provide time range for "TOTAL" requests',
        );
      }

      ({ eventMetrics, points } =
        await this.eventsService.getTotalEventMetricsAndPointsForUser(
          user,
          query.start,
          query.end,
        ));
    }

    return {
      user_id: id,
      granularity: query.granularity,
      points,
      pools,
      node_uptime: nodeUptime,
      metrics: {
        blocks_mined: eventMetrics[EventType.BLOCK_MINED],
        bugs_caught: eventMetrics[EventType.BUG_CAUGHT],
        community_contributions: eventMetrics[EventType.COMMUNITY_CONTRIBUTION],
        pull_requests_merged: eventMetrics[EventType.PULL_REQUEST_MERGED],
        social_media_contributions:
          eventMetrics[EventType.SOCIAL_MEDIA_PROMOTION],
        node_uptime: eventMetrics[EventType.NODE_UPTIME],
        send_transaction: eventMetrics[EventType.SEND_TRANSACTION],
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

    const {
      data: records,
      hasNext,
      hasPrevious,
    } = await this.usersService.list({
      after,
      before,
      limit,
      search,
      countryCode,
    });
    const data = [];
    for (const record of records) {
      const userPoints = await this.userPointsService.findOrThrow(record.id);
      data.push(serializedUserFromRecord(record, userPoints));
    }

    return {
      object: 'list',
      data: data,
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
    @Param('id', new IntIsSafeForPrismaPipe())
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
      github: dto.github,
      graffiti: dto.graffiti,
      telegram: dto.telegram,
    });
  }
}
