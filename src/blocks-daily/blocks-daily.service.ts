/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
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

  async upsert(
    prisma: BasePrismaClient,
    options: CreateBlocksDailyOptions,
  ): Promise<BlockDaily> {
    return prisma.blockDaily.upsert({
      create: {
        average_block_time_ms: options.averageBlockTimeMs,
        average_difficulty_millis: options.averageDifficultyMillis,
        blocks_count: options.blocksCount,
        blocks_with_graffiti_count: options.blocksWithGraffitiCount,
        chain_sequence: options.chainSequence,
        cumulative_unique_graffiti: options.cumulativeUniqueGraffiti,
        date: options.date,
        transactions_count: options.transactionsCount,
        unique_graffiti: options.uniqueGraffiti,
      },
      update: {
        average_block_time_ms: options.averageBlockTimeMs,
        average_difficulty_millis: options.averageDifficultyMillis,
        blocks_count: options.blocksCount,
        blocks_with_graffiti_count: options.blocksWithGraffitiCount,
        chain_sequence: options.chainSequence,
        cumulative_unique_graffiti: options.cumulativeUniqueGraffiti,
        transactions_count: options.transactionsCount,
        unique_graffiti: options.uniqueGraffiti,
      },
      where: {
        date: options.date,
      },
    });
  }
}
