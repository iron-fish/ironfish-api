/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  NotImplementedException,
  Param,
  ParseIntPipe,
  Query,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { MS_PER_DAY } from '../common/constants';
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
    const account = await this.accountsService.find({ id });
    if (!account) {
      throw new NotFoundException();
    }
    return account;
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
    const account = await this.accountsService.find({ id });
    if (!account) {
      throw new NotFoundException();
    }

    const { start, end, granularity } = query;
    if (granularity === MetricsGranularity.LIFETIME) {
      const lifetimeCounts =
        await this.eventsService.getLifetimeEventCountsForAccount(account);
      return {
        account_id: account.id,
        granularity,
        metrics: {
          blocks_mined: lifetimeCounts[EventType.BLOCK_MINED],
          bugs_caught: lifetimeCounts[EventType.BUG_CAUGHT],
          community_contributions:
            lifetimeCounts[EventType.COMMUNITY_CONTRIBUTION],
          nodes_hosted: lifetimeCounts[EventType.NODE_HOSTED],
          pull_requests_merged: lifetimeCounts[EventType.PULL_REQUEST_MERGED],
          social_media_contributions:
            lifetimeCounts[EventType.SOCIAL_MEDIA_PROMOTION],
        },
      };
    }
    throw new NotImplementedException();
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
    } else if (granularity === MetricsGranularity.TOTAL) {
      return {
        isValid: false,
        error: 'Must provide time range for "TOTAL" requests',
      };
    }
    return { isValid: true };
  }
}
