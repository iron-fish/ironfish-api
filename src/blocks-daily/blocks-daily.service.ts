/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { getNextDate } from '../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlocksDailyOptions } from './interfaces/create-blocks-daily-options';
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

  async upsert(options: CreateBlocksDailyOptions): Promise<BlockDaily> {
    return this.prisma.blockDaily.upsert({
      create: {
        average_block_time_ms: options.averageBlockTimeMs,
        average_difficulty: options.averageDifficulty,
        blocks_count: options.blocksCount,
        blocks_with_graffiti_count: options.blocksWithGraffitiCount,
        chain_sequence: options.chainSequence,
        cumulative_unique_graffiti: options.cumulativeUniqueGraffiti,
        date: options.date,
        transactions_count: options.transactionsCount,
        unique_graffiti_count: options.uniqueGraffiti,
      },
      update: {
        average_block_time_ms: options.averageBlockTimeMs,
        average_difficulty: options.averageDifficulty,
        blocks_count: options.blocksCount,
        blocks_with_graffiti_count: options.blocksWithGraffitiCount,
        chain_sequence: options.chainSequence,
        cumulative_unique_graffiti: options.cumulativeUniqueGraffiti,
        transactions_count: options.transactionsCount,
        unique_graffiti_count: options.uniqueGraffiti,
      },
      where: {
        date: options.date,
      },
    });
  }

  async getNextDateToSync(): Promise<Date> {
    const aggregate = await this.prisma.blockDaily.aggregate({
      _max: {
        date: true,
      },
    });
    // 2023 April 20 12 AM UTC
    const defaultStart = new Date(Date.UTC(2023, 3, 20, 0, 0, 0));
    const latestDate = aggregate._max.date;
    if (!latestDate) {
      return defaultStart;
    }
    return getNextDate(latestDate);
  }
}
