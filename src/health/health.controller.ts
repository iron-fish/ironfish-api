/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { DepositsUpsertService } from '../events/deposits.upsert.service';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly graphileService: GraphileWorkerService,
    private readonly depositsUpsertService: DepositsUpsertService,
  ) {}

  @ApiOperation({ summary: 'Gets the health of the Iron Fish API' })
  @Get()
  health(): string {
    return 'OK';
  }

  @ApiExcludeEndpoint()
  @UseGuards(ApiKeyGuard)
  @Get('admin')
  async admin(): Promise<{
    queued_jobs: number;
    mismatched_deposits: number;
  }> {
    const [queuedJobs, mismatchedDeposits] = await Promise.all([
      this.graphileService.queuedJobCount(),
      this.depositsUpsertService.mismatchedDepositCount(),
    ]);
    return {
      queued_jobs: queuedJobs,
      mismatched_deposits: mismatchedDeposits,
    };
  }
}
