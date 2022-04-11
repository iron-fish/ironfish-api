/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NodeUptime } from '.prisma/client';

@Injectable()
export class NodeUptimesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: User): Promise<NodeUptime | null> {
    const now = new Date();
    const oneHourAgo = new Date();
    oneHourAgo.setHours(now.getHours() - 1);

    return this.prisma.$transaction(async (prisma) => {
      const nodeUptime = await this.get(user);
      if (nodeUptime && nodeUptime.last_checked_in >= oneHourAgo) {
        return null;
      }

      return prisma.nodeUptime.upsert({
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
    });
  }

  async get(user: User): Promise<NodeUptime | null> {
    return this.prisma.nodeUptime.findUnique({
      where: {
        user_id: user.id,
      },
    });
  }
}
