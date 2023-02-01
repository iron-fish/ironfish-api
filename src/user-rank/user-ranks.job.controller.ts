/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerException } from '../graphile-worker/graphile-worker-exception';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { UserRanksLoader } from './user-ranks.loader.service';

@Controller()
export class UserRanksJobsController {
  constructor(private readonly userRanksLoader: UserRanksLoader) {}

  @MessagePattern(GraphileWorkerPattern.UPDATE_USER_RANKS)
  @UseFilters(new GraphileWorkerException())
  async updateUserRanks(): Promise<GraphileWorkerHandlerResponse> {
    await this.userRanksLoader.updateRanks();
    return { requeue: false };
  }
}
