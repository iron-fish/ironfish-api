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
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateNodeUptimeEventOptions } from './interfaces/create-node-uptime-event-options';
import { NodeUptimesService } from './node-uptimes.service';

@Controller()
export class NodeUptimesJobsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly loggerService: LoggerService,
    private readonly nodeUptimesService: NodeUptimesService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  @MessagePattern(GraphileWorkerPattern.CREATE_NODE_UPTIME_EVENT)
  async createNodeUptimeEvent({
    userId,
  }: CreateNodeUptimeEventOptions): Promise<GraphileWorkerHandlerResponse> {
    const user = await this.usersService.find(userId);
    if (!user) {
      this.loggerService.error(`No user found for '${userId}'`, '');
      return { requeue: false };
    }

    await this.prisma.$transaction(async (prisma) => {
      const event = await this.eventsService.createNodeUptimeEventWithClient(
        user,
        prisma,
      );

      if (!event) {
        throw new Error(`Error creating node uptime event`);
      }

      const nodeUptime =
        await this.nodeUptimesService.decrementCountedHoursWithClient(
          user,
          prisma,
        );

      if (!nodeUptime) {
        throw new Error(`Error updating node uptime table`);
      }
    });
    return { requeue: false };
  }
}
