/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BlocksService } from '../blocks/blocks.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { LoggerService } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserPointsService } from '../user-points/user-points.service';
import { UsersService } from '../users/users.service';
import { EventsService } from './events.service';
import { DeleteBlockMinedEventOptions } from './interfaces/delete-block-mined-event-options';
import { UpsertBlockMinedEventOptions } from './interfaces/upsert-block-mined-event-options';
import { EventType } from '.prisma/client';

@Controller()
export class EventsJobsController {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly eventsService: EventsService,
    private readonly loggerService: LoggerService,
    private readonly usersService: UsersService,
    private readonly userPointsService: UserPointsService,
    private readonly prisma: PrismaService,
  ) {}

  @MessagePattern(GraphileWorkerPattern.UPSERT_BLOCK_MINED_EVENT)
  async upsertBlockMinedEvent({
    block_id: blockId,
    user_id: userId,
  }: UpsertBlockMinedEventOptions): Promise<GraphileWorkerHandlerResponse> {
    const user = await this.usersService.find(userId);
    if (!user) {
      this.loggerService.error(`No user found for '${userId}'`, '');
      return { requeue: false };
    }

    const block = await this.blocksService.find(blockId);
    if (!block) {
      this.loggerService.error(`No block found for '${blockId}'`, '');
      return { requeue: false };
    }

    await this.eventsService.upsertBlockMined(block, user);
    return { requeue: false };
  }

  @MessagePattern(GraphileWorkerPattern.DELETE_BLOCK_MINED_EVENT)
  async deleteBlockMinedEvent({
    block_id: blockId,
  }: DeleteBlockMinedEventOptions): Promise<GraphileWorkerHandlerResponse> {
    const block = await this.blocksService.find(blockId);
    if (!block) {
      this.loggerService.error(`No block found for '${blockId}'`, '');
      return { requeue: false };
    }

    await this.eventsService.deleteBlockMined(block);
    return { requeue: false };
  }

  @MessagePattern(GraphileWorkerPattern.UPDATE_LATEST_POINTS)
  async updateLatestPoints({
    userId,
    type,
  }: {
    userId: number;
    type: EventType;
  }): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      const occurredAtAggregate = await prisma.event.aggregate({
        _max: {
          occurred_at: true,
        },
        where: {
          type,
          user_id: userId,
          deleted_at: null,
        },
      });
      const latestOccurredAt = occurredAtAggregate._max.occurred_at;

      const pointsAggregate = await prisma.event.aggregate({
        _sum: {
          points: true,
        },
        where: {
          type,
          user_id: userId,
          deleted_at: null,
        },
      });
      const points = pointsAggregate._sum.points ?? 0;

      const totalPointsAggregate = await prisma.event.aggregate({
        _sum: {
          points: true,
        },
        where: {
          user_id: userId,
          deleted_at: null,
        },
      });
      const totalPoints = totalPointsAggregate._sum.points ?? 0;

      await this.userPointsService.upsertWithClient(
        {
          userId,
          points: { [type]: { points, latestOccurredAt } },
          totalPoints,
        },
        prisma,
      );
    });
  }
}
