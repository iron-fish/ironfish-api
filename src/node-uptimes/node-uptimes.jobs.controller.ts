/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { LoggerService } from '../logger/logger.service';
import { UsersService } from '../users/users.service';
import { CreateNodeUptimeEventOptions } from './interfaces/create-node-uptime-event-options';
import { NodeUptimesLoader } from './node-uptimes-loader';

@Controller()
export class NodeUptimesJobsController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly nodeUptimesLoader: NodeUptimesLoader,
    private readonly usersService: UsersService,
  ) {}

  @MessagePattern(GraphileWorkerPattern.CREATE_NODE_UPTIME_EVENT)
  async createNodeUptimeEvent({
    userId,
    occurredAt,
  }: CreateNodeUptimeEventOptions): Promise<GraphileWorkerHandlerResponse> {
    occurredAt = new Date(occurredAt);

    const user = await this.usersService.find(userId);
    if (!user) {
      this.loggerService.error(`No user found for '${userId}'`, '');
      return { requeue: false };
    }

    await this.nodeUptimesLoader.incrementUptimeAndCreateEvent(
      user,
      occurredAt,
    );

    return { requeue: false };
  }
}
