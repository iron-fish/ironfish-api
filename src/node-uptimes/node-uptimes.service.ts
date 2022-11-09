/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import {
  NODE_UPTIME_CHECKIN_HOURS,
  NODE_UPTIME_CREDIT_HOURS,
} from '../common/constants';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { NodeUptime } from '.prisma/client';

@Injectable()
export class NodeUptimesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graphileWorkerService: GraphileWorkerService,
  ) {}

  async addUptime(user: User): Promise<NodeUptime> {
    const now = new Date();

    const lastCheckinCutoff = new Date();
    lastCheckinCutoff.setHours(now.getHours() - NODE_UPTIME_CHECKIN_HOURS);

    const uptime = await this.prisma.$transaction(async (prisma) => {
      await prisma.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(HASHTEXT($1));`,
        user.id.toString(),
      );

      let uptime = await this.getWithClient(user, prisma);
      if (uptime && uptime.last_checked_in >= lastCheckinCutoff) {
        return uptime;
      }

      uptime = await prisma.nodeUptime.upsert({
        where: {
          user_id: user.id,
        },
        update: {
          last_checked_in: now.toISOString(),
          total_hours: {
            increment: 1,
          },
        },
        create: {
          user_id: user.id,
          last_checked_in: now.toISOString(),
          total_hours: 0,
        },
      });

      return uptime;
    });

    if (uptime.total_hours >= NODE_UPTIME_CREDIT_HOURS) {
      const userId = user.id;
      await this.graphileWorkerService.addJob(
        GraphileWorkerPattern.CREATE_NODE_UPTIME_EVENT,
        { userId, occurredAt: now },
        {
          queueName: `update_node_uptime`,
          jobKey: `update_node_uptime_for_${userId}`,
        },
      );
    }

    return uptime;
  }

  async get(user: User): Promise<NodeUptime | null> {
    return this.getWithClient(user, this.prisma.readClient);
  }

  async getWithClient(
    user: User,
    client: BasePrismaClient,
  ): Promise<NodeUptime | null> {
    return client.nodeUptime.findUnique({
      where: {
        user_id: user.id,
      },
    });
  }

  async decrementCountedHoursWithClient(
    uptime: NodeUptime,
    client: BasePrismaClient,
  ): Promise<NodeUptime> {
    return client.nodeUptime.update({
      where: {
        id: uptime.id,
      },
      data: {
        total_hours: {
          decrement: NODE_UPTIME_CREDIT_HOURS,
        },
      },
    });
  }
}
