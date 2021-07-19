/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { MS_PER_DAY } from '../common/constants';
import { PaginationArgsDto } from '../common/dto/pagination-args.dto';
import { List } from '../common/interfaces/list';
import { EventsService } from '../events/events.service';
import { AccountsService } from './accounts.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { MetricsGranularity } from './enums/metrics-granularity';
import { SerializedAccountMetrics } from './interfaces/serialized-account-metrics';
import { Account, EventType } from '.prisma/client';

const MAX_SUPPORTED_TIME_RANGE_IN_DAYS = 30;

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly eventsService: EventsService,
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
  ): Promise<Account> {
    return this.accountsService.findOrThrow(id);
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
  ): Promise<SerializedAccountMetrics> {
    const { isValid, error } = this.isValidMetricsQuery(query);
    if (!isValid) {
      throw new UnprocessableEntityException(error);
    }

    let eventCounts: Record<EventType, number>;
    const { start, end, granularity } = query;
    if (granularity === MetricsGranularity.LIFETIME) {
      const account = await this.accountsService.findOrThrow(id);
      eventCounts = await this.eventsService.getLifetimeEventCountsForAccount(
        account,
      );
    } else {
      if (start === undefined || end === undefined) {
        throw new UnprocessableEntityException(
          'Must provide time range for "TOTAL" requests',
        );
      }
      const account = await this.accountsService.findOrThrow(id);
      eventCounts = await this.eventsService.getTotalEventCountsForAccount(
        account,
        start,
        end,
      );
    }

    return {
      account_id: id,
      granularity,
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
    { after, before, limit }: PaginationArgsDto,
  ): Promise<List<Account>> {
    return {
      data: await this.accountsService.list({
        after,
        before,
        limit,
      }),
    };
  }
}
