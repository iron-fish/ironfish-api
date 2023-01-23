/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { NODE_UPTIME_CREDIT_HOURS } from '../common/constants';
import { EventsService } from '../events/events.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { NodeUptimesService } from './node-uptimes.service';
import { User } from '.prisma/client';

@Injectable()
export class NodeUptimesLoader {
  constructor(
    private readonly eventsService: EventsService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly nodeUptimesService: NodeUptimesService,
    private readonly prisma: PrismaService,
  ) {}

  async incrementUptimeAndCreateEvent(
    user: User,
    occurredAt: Date,
  ): Promise<void> {
    const uptime = await this.prisma.$transaction(async (prisma) => {
      const uptime = await this.nodeUptimesService.addUptime(user, prisma);
      if (uptime.total_hours < NODE_UPTIME_CREDIT_HOURS) {
        return uptime;
      }

      const createdEventsCount =
        await this.eventsService.createNodeUptimeEventWithClient(
          user,
          occurredAt,
          uptime,
          prisma,
        );

      if (!createdEventsCount) {
        throw new Error(`Error creating node uptime event`);
      }

      await this.nodeUptimesService.decrementCountedHoursWithClient(
        uptime,
        createdEventsCount * NODE_UPTIME_CREDIT_HOURS,
        prisma,
      );

      return uptime;
    });

    if (!uptime || uptime.total_hours < NODE_UPTIME_CREDIT_HOURS) {
      return;
    }

    await this.eventsService.addUpdateLatestPointsJob(
      uptime.user_id,
      EventType.NODE_UPTIME,
    );
  }

  async addUptime(user: User): Promise<void> {
    const now = new Date();

    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.CREATE_NODE_UPTIME_EVENT,
      { userId: user.id, occurredAt: now },
      {
        queueName: `update_node_uptime`,
        jobKey: `update_node_uptime_for_${user.id}`,
      },
    );
  }
}
