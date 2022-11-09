/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerHandlerResponse } from '../graphile-worker/interfaces/graphile-worker-handler-response';
import { LoggerService } from '../logger/logger.service';
import { UsersService } from '../users/users.service';
import {
  CreateNodeUptimeEventOptions,
  CreateNodeUptimeEventOptionsList,
} from './interfaces/create-node-uptime-event-options';
import { CreateEvent, NodeUptimesLoader } from './node-uptimes-loader';

@Controller()
export class NodeUptimesJobsController {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly nodeUptimesLoader: NodeUptimesLoader,
    private readonly usersService: UsersService,
  ) {}

  @MessagePattern(GraphileWorkerPattern.CREATE_NODE_UPTIME_EVENT)
  async createNodeUptimeEvents(
    uptimeEvents: CreateNodeUptimeEventOptionsList,
  ): Promise<GraphileWorkerHandlerResponse> {
    const users = await this.usersService.findMany(
      uptimeEvents.map((uptimeEvent) => uptimeEvent.userId),
    );
    // gather just the most recent uptime event for each user
    const reducedUptimeEvents = [
      ...new Map(
        uptimeEvents.map((uptimeEvent) => [uptimeEvent['userId'], uptimeEvent]),
      ).values(),
    ];
    const uptimeEventsWithUser = new Array<CreateEvent>();
    for (const uptimeEvent of reducedUptimeEvents) {
      const user = users.get(uptimeEvent.userId);
      if (!user) {
        this.loggerService.error(
          `No user found for '${uptimeEvent.userId}'`,
          '',
        );
        continue;
      }
      uptimeEventsWithUser.push({ user, occurredAt: uptimeEvent.occurredAt });
    }

    await this.nodeUptimesLoader.createEvent(uptimeEventsWithUser);
    return { requeue: false };
  }
}
