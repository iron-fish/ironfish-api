/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { BlocksService } from '../blocks/blocks.service';
import { BlocksDailyService } from '../blocks-daily/blocks-daily.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlocksDailyLoader {
  constructor(
    private readonly blocksDailyService: BlocksDailyService,
    private readonly blocksService: BlocksService,
    private readonly prisma: PrismaService,
  ) {}

  async loadDateMetrics(date: Date): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      const dateMetrics = await this.blocksService.getDateMetrics(prisma, date);
      await this.blocksDailyService.create(prisma, { date, ...dateMetrics });
    });
  }
}
