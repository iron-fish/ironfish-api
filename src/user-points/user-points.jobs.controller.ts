/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { EventsService } from '../events/events.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { LoggerService } from '../logger/logger.service';
import { UsersService } from '../users/users.service';
import { RefreshUserPointsOptions } from './interfaces/refresh-user-points-options';
import { UserPointsService } from './user-points.service';
import { User } from '.prisma/client';

@Controller()
export class UserPointsJobsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly loggerService: LoggerService,
    private readonly usersService: UsersService,
    private readonly userPointsService: UserPointsService,
  ) {}

  @MessagePattern(GraphileWorkerPattern.REFRESH_USERS_POINTS)
  async refreshUsersPoints(): Promise<GraphileWorkerHandlerResponse> {
    for await (const user of this.usersGenerator()) {
      await this.graphileWorkerService.addJob<RefreshUserPointsOptions>(
        GraphileWorkerPattern.REFRESH_USER_POINTS,
        { userId: user.id },
      );
    }
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

  @MessagePattern(GraphileWorkerPattern.REFRESH_USER_POINTS)
  async refreshUserPoints({
    userId,
  }: RefreshUserPointsOptions): Promise<GraphileWorkerHandlerResponse> {
    const user = await this.usersService.find(userId);
    if (!user) {
      this.loggerService.error(`No user found for '${userId}'`, '');
      return { requeue: false };
    }

    const options = await this.eventsService.getUpsertPointsOptions(user);
    await this.userPointsService.upsert(options);
    return { requeue: false };
  }
}
