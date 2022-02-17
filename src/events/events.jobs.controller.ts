/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BlocksService } from '../blocks/blocks.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { LoggerService } from '../logger/logger.service';
import { UsersService } from '../users/users.service';
import { EventsService } from './events.service';
import { DeleteBlockMinedEventOptions } from './interfaces/delete-block-mined-event-options';
import { UpsertBlockMinedEventOptions } from './interfaces/upsert-block-mined-event-options';

@Controller()
export class EventsJobsController {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly eventsService: EventsService,
    private readonly loggerService: LoggerService,
    private readonly usersService: UsersService,
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
}
