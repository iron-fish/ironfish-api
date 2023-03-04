/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { GraphileWorkerException } from '../graphile-worker/graphile-worker-exception';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { LoggerService } from '../logger/logger.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { UsersService } from '../users/users.service';
import { RefreshUserRedemptionOptions } from './interfaces/refresh-user-redemption-options';
import { KycService } from './kyc.service';
import { User } from '.prisma/client';

@Controller()
export class KycJobsController {
  constructor(
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly loggerService: LoggerService,
    private readonly usersService: UsersService,
    private readonly kycService: KycService,
    private readonly jumioTransactionService: JumioTransactionService,
    private readonly redemptionService: RedemptionService,
  ) {}

  @MessagePattern(GraphileWorkerPattern.REFRESH_USERS_REDEMPTION)
  @UseFilters(new GraphileWorkerException())
  async refreshUsersPoints(): Promise<GraphileWorkerHandlerResponse> {
    for await (const user of this.usersGenerator()) {
      await this.graphileWorkerService.addJob<RefreshUserRedemptionOptions>(
        GraphileWorkerPattern.REFRESH_USER_POINTS,
        { userId: user.id },
      );
    }
    return { requeue: false };
  }

  @MessagePattern(GraphileWorkerPattern.REFRESH_USER_REDEMPTION)
  @UseFilters(new GraphileWorkerException())
  async refreshUserPoints({
    userId,
  }: RefreshUserRedemptionOptions): Promise<GraphileWorkerHandlerResponse> {
    const user = await this.usersService.find(userId);
    if (!user) {
      this.loggerService.error(`No user found for '${userId}'`, '');
      return { requeue: false };
    }

    const redemption = await this.redemptionService.find(user);
    if (!redemption) {
      return { requeue: false };
    }

    const transaction = await this.jumioTransactionService.findLatest(user);
    if (!transaction) {
      return { requeue: false };
    }

    await this.kycService.refresh(redemption, transaction);
    return { requeue: false };
  }

  private async *usersGenerator(): AsyncGenerator<User> {
    let after: number | undefined;
    let hasNext = false;
    do {
      const response = await this.usersService.list({ after });
      const { data } = response;
      hasNext = response.hasNext;
      if (data.length && hasNext) {
        after = data[data.length - 1].id;
      }

      for (const user of data) {
        yield user;
      }
    } while (hasNext);
  }
}
