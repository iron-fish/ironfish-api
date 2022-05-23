/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { DepositsUpsertService } from './deposits.upsert.service';
import { UpsertDepositsOperationDto } from './dto/upsert-deposit.dto';

@Controller()
export class DepositsJobsController {
  constructor(private readonly depositsUpsertService: DepositsUpsertService) {}

  @MessagePattern(GraphileWorkerPattern.UPSERT_DEPOSIT)
  async upsert(
    options: UpsertDepositsOperationDto,
  ): Promise<GraphileWorkerHandlerResponse> {
    await this.depositsUpsertService.upsert(options);
    return { requeue: false };
  }
}
