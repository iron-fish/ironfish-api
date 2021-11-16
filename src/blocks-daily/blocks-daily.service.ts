/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockDaily } from '.prisma/client';

@Injectable()
export class BlocksDailyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(start: Date, end: Date): Promise<BlockDaily[]> {
    return this.prisma.blockDaily.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
    });
  }
}
