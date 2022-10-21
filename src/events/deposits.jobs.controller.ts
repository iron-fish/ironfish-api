/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Deposit } from '@prisma/client';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerException } from '../graphile-worker/graphile-worker-exception';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { DepositsUpsertService } from './deposits.upsert.service';
import { UpsertDepositsOperationDto } from './dto/upsert-deposit.dto';

@Controller()
export class DepositsJobsController {
  constructor(private readonly depositsUpsertService: DepositsUpsertService) {}

  @MessagePattern(GraphileWorkerPattern.UPSERT_DEPOSIT)
  @UseFilters(new GraphileWorkerException())
  async upsert(
    options: UpsertDepositsOperationDto,
  ): Promise<GraphileWorkerHandlerResponse> {
    await this.depositsUpsertService.upsert(options);
    return { requeue: false };
  }

  @MessagePattern(GraphileWorkerPattern.REFRESH_DEPOSITS)
  @UseFilters(new GraphileWorkerException())
  async refreshDeposits(): Promise<GraphileWorkerHandlerResponse> {
    await this.depositsUpsertService.refreshDeposits();
    return { requeue: false };
  }

  @MessagePattern(GraphileWorkerPattern.SYNC_DEPOSITED_IRON)
  @UseFilters(new GraphileWorkerException())
  async syncDepositedIron(): Promise<GraphileWorkerHandlerResponse> {
    await this.depositsUpsertService.syncDepositedIron();
    return { requeue: false };
  }

  @MessagePattern(GraphileWorkerPattern.REFRESH_DEPOSIT)
  @UseFilters(new GraphileWorkerException())
  async refreshDeposit(
    mismatchedDeposit: Deposit & {
      block_main: boolean | null;
      block_timestamp: Date | null;
    },
  ): Promise<GraphileWorkerHandlerResponse> {
    await this.depositsUpsertService.refreshDeposit(mismatchedDeposit);
    return { requeue: false };
  }
}
