/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
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
import { Request } from 'express';
import { Secret, sign, SignOptions } from 'jsonwebtoken';
import { ApiConfigService } from '../api-config/api-config.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { MagicLinkGuard } from '../auth/guards/magic-link.guard';
import { DEFAULT_LIMIT, MAX_LIMIT, MS_PER_DAY } from '../common/constants';
import { Context } from '../common/decorators/context';
import { MetricsGranularity } from '../common/enums/metrics-granularity';
import { MetricsPool } from '../common/enums/metrics-pool';
import { MagicLinkContext } from '../common/interfaces/magic-link-context';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { IntIsSafeForPrismaPipe } from '../common/pipes/int-is-safe-for-prisma.pipe';
import { fetchIpAddressFromRequest } from '../common/utils/request';
import { EventsService } from '../events/events.service';
import { SerializedEventMetrics } from '../events/interfaces/serialized-event-metrics';
import { NodeUptimesService } from '../node-uptimes/node-uptimes.service';
import { RecaptchaVerificationService } from '../recaptcha-verification/recaptcha-verification.service';
import { UserPointsService } from '../user-points/user-points.service';
import { UserRanksService } from '../user-rank/user-ranks.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMetricsQueryDto } from './dto/user-metrics-query.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { SerializedUser } from './interfaces/serialized-user';
import { SerializedUserLoginUrl } from './interfaces/serialized-user-login-url';
import { SerializedUserMetrics } from './interfaces/serialized-user-metrics';
import { SerializedUserWithRank } from './interfaces/serialized-user-with-rank';
import { UsersService } from './users.service';
import { UsersUpdater } from './users-updater';
import { serializedUserFromRecord } from './utils/user-translator';
import { EventType, User } from '.prisma/client';

const MAX_SUPPORTED_TIME_RANGE_IN_DAYS = 30;

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly config: ApiConfigService,
    private readonly eventsService: EventsService,
    private readonly nodeUptimeService: NodeUptimesService,
    private readonly userPointsService: UserPointsService,
    private readonly userRankService: UserRanksService,
    private readonly usersService: UsersService,
    private readonly usersUpdater: UsersUpdater,
    private readonly recaptchaVerificationService: RecaptchaVerificationService,
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
    { graffiti }: UserQueryDto,
  ): Promise<SerializedUser> {
    const user = await this.usersService.findByGraffitiOrThrow(graffiti);
    const userPoints = await this.userPointsService.findOrThrow(user.id);
    return serializedUserFromRecord(user, userPoints);
  }

  @ApiOperation({ summary: 'Gets a specific User' })
  @ApiParam({ description: 'Unique User identifier', name: 'id' })
  @Get(':id')
  async get(
    @Param('id', new IntIsSafeForPrismaPipe())
    id: number,
  ): Promise<SerializedUser> {
    const user = await this.usersService.findOrThrow(id);
    const userPoints = await this.userPointsService.findOrThrow(user.id);
    return serializedUserFromRecord(user, userPoints);
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
    let poolPoints;
    let nodeUptime: SerializedUserMetrics['node_uptime'];

    if (query.granularity === MetricsGranularity.LIFETIME) {
      const userPoints = await this.userPointsService.findOrThrow(user.id);
      points = userPoints.total_points;

      eventMetrics =
        this.eventsService.getLifetimeEventMetricsForUser(userPoints);

      pools = {
        main: await this.eventsService.getLifetimeEventsMetricsForUser(
          user,
          EventType.POOL4,
        ),
        code: await this.eventsService.getLifetimeEventsMetricsForUser(
          user,
          EventType.PULL_REQUEST_MERGED,
        ),
      };

      poolPoints = {
        pool_one: userPoints.pool1_points ?? 0,
        pool_two: userPoints.pool2_points ?? 0,
        pool_three: userPoints.pool3_points ?? 0,
        pool_four: userPoints.pool4_points,
      };

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
      pool_points: poolPoints,
      metrics: {
        blocks_mined: eventMetrics[EventType.BLOCK_MINED],
        bugs_caught: eventMetrics[EventType.BUG_CAUGHT],
        community_contributions: eventMetrics[EventType.COMMUNITY_CONTRIBUTION],
        pull_requests_merged: eventMetrics[EventType.PULL_REQUEST_MERGED],
        social_media_contributions:
          eventMetrics[EventType.SOCIAL_MEDIA_PROMOTION],
        node_uptime: eventMetrics[EventType.NODE_UPTIME],
        send_transaction: eventMetrics[EventType.SEND_TRANSACTION],
        multi_asset_burn: eventMetrics[EventType.MULTI_ASSET_BURN],
        multi_asset_mint: eventMetrics[EventType.MULTI_ASSET_MINT],
        multi_asset_transfer: eventMetrics[EventType.MULTI_ASSET_TRANSFER],
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
        await this.userRankService.listWithRank({
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
    @Req() request: Request,
  ): Promise<User> {
    if (!this.config.get<string>('ENABLE_SIGNUP')) {
      throw new HttpException(
        'Signup has been disabled',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const remoteIp = fetchIpAddressFromRequest(request);
    const isRecaptchaValid = await this.recaptchaVerificationService.verify(
      dto.recaptcha,
      remoteIp,
      'signup',
    );

    if (!isRecaptchaValid) {
      throw new HttpException(
        'Failed to sign up',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.usersService.create({
      email: dto.email,
      graffiti: dto.graffiti,
      countryCode: dto.country_code,
      discord: dto.discord,
      telegram: dto.telegram,
      github: dto.github,
    });
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

    if (!this.config.get<boolean>('ENABLE_USER_UPDATING')) {
      return user;
    }

    return this.usersUpdater.update(user, {
      discord: dto.discord,
      github: dto.github,
      telegram: dto.telegram,
    });
  }

  @ApiExcludeEndpoint()
  @Post(':id/token')
  @UseGuards(ApiKeyGuard)
  async createAuthToken(
    @Param('id', new IntIsSafeForPrismaPipe())
    id: number,
  ): Promise<SerializedUserLoginUrl> {
    const user = await this.usersService.findOrThrow(id);

    const secret: Secret = this.config.get<string>('JWT_TOKEN_SECRET');
    const options: SignOptions = {
      algorithm: 'HS256',
      expiresIn: '1d',
    };

    const token: string = sign(
      { sub: user.email, iat: Math.floor(Date.now() / 1000) },
      secret,
      options,
    );

    return {
      url: `https://api.ironfish.network/login?token=${token}`,
      email: user.email,
    };
  }
}
