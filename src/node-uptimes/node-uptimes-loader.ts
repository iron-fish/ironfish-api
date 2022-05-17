/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { NODE_UPTIME_CREDIT_HOURS } from '../common/constants';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { NodeUptimesService } from './node-uptimes.service';
import { User } from '.prisma/client';

@Injectable()
export class NodeUptimesLoader {
  constructor(
    private readonly eventsService: EventsService,
    private readonly nodeUptimesService: NodeUptimesService,
    private readonly prisma: PrismaService,
  ) {}

  async createEvent(user: User, occurredAt: Date): Promise<void> {
    const uptime = await this.nodeUptimesService.get(user);
    if (!uptime || uptime.total_hours < NODE_UPTIME_CREDIT_HOURS) {
      return;
    }

    await this.prisma.$transaction(async (prisma) => {
      const event = await this.eventsService.createNodeUptimeEventWithClient(
        user,
        occurredAt,
        prisma,
      );
      if (!event) {
        throw new Error(`Error creating node uptime event`);
      }

      await this.nodeUptimesService.decrementCountedHoursWithClient(
        uptime,
        prisma,
      );
    });
  }
}
