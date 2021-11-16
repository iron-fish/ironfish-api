/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BlocksDailyLoader } from '../blocks-daily-loader/blocks-daily-loader';
import { getNextDate } from '../common/utils/date';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { SyncBlocksDailyOptions } from './interfaces/sync-blocks-daily-options';

@Controller()
export class BlocksDailyJobsController {
  constructor(
    private readonly blocksDailyLoader: BlocksDailyLoader,
    private readonly graphileWorkerService: GraphileWorkerService,
  ) {}

  @MessagePattern(GraphileWorkerPattern.SYNC_BLOCKS_DAILY)
  async sync({
    date,
  }: SyncBlocksDailyOptions): Promise<GraphileWorkerHandlerResponse> {
    await this.blocksDailyLoader.loadDateMetrics(date);

    const nextDate = getNextDate(date);
    await this.graphileWorkerService.addJob<SyncBlocksDailyOptions>(
      GraphileWorkerPattern.SYNC_BLOCKS_DAILY,
      { date: nextDate },
      nextDate,
    );

    return { requeue: false };
  }
}
