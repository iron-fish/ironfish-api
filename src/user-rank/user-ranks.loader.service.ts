/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { UserRanksService } from './user-ranks.service';
@Injectable()
export class UserRanksLoader {
  constructor(
    private readonly userRankService: UserRanksService,
    private readonly graphileWorkerService: GraphileWorkerService,
  ) {}

  async updateRanks(): Promise<void> {
    await this.userRankService.updateRanks();

    const runAt = new Date();
    runAt.setMinutes(runAt.getMinutes() + 5);
    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.UPDATE_USER_RANKS,
      {},
      { jobKey: 'update_ranks', runAt },
    );
  }
}
