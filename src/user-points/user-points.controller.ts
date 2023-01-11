/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { IntIsSafeForPrismaPipe } from '../common/pipes/int-is-safe-for-prisma.pipe';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { RefreshUserPointsOptions } from './interfaces/refresh-user-points-options';

@ApiExcludeController()
@Controller('user_points')
export class UserPointsController {
  constructor(private readonly graphileWorkerService: GraphileWorkerService) {}

  @ApiExcludeEndpoint()
  @UseGuards(ApiKeyGuard)
  @Post('refresh')
  async refresh(): Promise<void> {
    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.REFRESH_USERS_POINTS,
    );
  }

  @ApiExcludeEndpoint()
  @UseGuards(ApiKeyGuard)
  @Post('refresh/:user_id')
  async refreshUser(
    @Param('user_id', new IntIsSafeForPrismaPipe())
    user_id: number,
  ): Promise<void> {
    await this.graphileWorkerService.addJob<RefreshUserPointsOptions>(
      GraphileWorkerPattern.REFRESH_USER_POINTS,
      { userId: user_id },
    );
  }
}
