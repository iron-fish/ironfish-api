/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { POOL_4_CATEGORIES } from '../common/constants';
import { EventsService } from '../events/events.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { GraphileWorkerException } from '../graphile-worker/graphile-worker-exception';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { LoggerService } from '../logger/logger.service';
import { UsersService } from '../users/users.service';
import { RefreshPool4Options } from './interfaces/refresh-pool-4-options';
import { RefreshUserPointsOptions } from './interfaces/refresh-user-points-options';
import { UserPointsOptions } from './interfaces/upsert-user-points-options';
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
  @UseFilters(new GraphileWorkerException())
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
  @UseFilters(new GraphileWorkerException())
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

  @MessagePattern(GraphileWorkerPattern.REFRESH_POOL_4_POINTS)
  @UseFilters(new GraphileWorkerException())
  async refreshPool4Points({
    userId,
    endDate,
  }: RefreshPool4Options): Promise<GraphileWorkerHandlerResponse> {
    const user = await this.usersService.find(userId);
    const end = endDate ?? new Date();

    if (!user) {
      this.loggerService.error(`No user found for '${userId}'`, '');
      return { requeue: false };
    }

    const eventPoints = await Promise.all(
      POOL_4_CATEGORIES.map(async (eventType) => {
        return await this.eventsService.getTotalEventTypeMetricsForUser(
          user,
          eventType,
          // Any points after Jan 1, 2023 are by definition from phase 3
          // (0 is January in JS date)
          new Date(2023, 0, 1),
          end,
        );
      }),
    );

    const pool4Points = eventPoints.reduce<UserPointsOptions>(
      (memo, category) => {
        if (!category.latestOccurredAt) {
          return memo;
        }

        let latestOccurredAt: Date | null;
        if (!memo.latestOccurredAt) {
          latestOccurredAt = category.latestOccurredAt;
        } else {
          latestOccurredAt =
            memo.latestOccurredAt > category.latestOccurredAt
              ? memo.latestOccurredAt
              : category.latestOccurredAt;
        }

        return {
          points: (memo.points || 0) + (category.points || 0),
          count: (memo.count || 0) + (category.count || 0),
          latestOccurredAt: latestOccurredAt,
        };
      },
      { points: 0, count: 0, latestOccurredAt: null },
    );

    await this.userPointsService.upsert({
      userId,
      points: { POOL4: pool4Points },
    });

    return { requeue: false };
  }
}
