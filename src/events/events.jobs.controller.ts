/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BlocksService } from '../blocks/blocks.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerException } from '../graphile-worker/graphile-worker-exception';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { LoggerService } from '../logger/logger.service';
import { UsersService } from '../users/users.service';
import { EventsService } from './events.service';
import { CreateEventOptions } from './interfaces/create-event-options';
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
  ) {}

  @MessagePattern(GraphileWorkerPattern.CREATE_EVENT)
  @UseFilters(new GraphileWorkerException())
  async createEvent(
    options: CreateEventOptions,
  ): Promise<GraphileWorkerHandlerResponse> {
    await this.eventsService.create(options);
    return { requeue: false };
  }

  @MessagePattern(GraphileWorkerPattern.UPSERT_BLOCK_MINED_EVENT)
  @UseFilters(new GraphileWorkerException())
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
  @UseFilters(new GraphileWorkerException())
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
  @UseFilters(new GraphileWorkerException())
  async updateLatestPoints({
    userId,
    type,
  }: {
    userId: number;
    type: EventType;
  }): Promise<void> {
    await this.eventsService.updateLatestPoints(userId, type);
  }
}
