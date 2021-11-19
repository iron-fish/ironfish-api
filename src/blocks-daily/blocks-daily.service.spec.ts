/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksDailyService } from './blocks-daily.service';

describe('BlocksDailyService', () => {
  let app: INestApplication;
  let blocksDailyService: BlocksDailyService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksDailyService = app.get(BlocksDailyService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('list', () => {
    const setup = async () => {
      await prisma.blockDaily.create({
        data: {
          average_block_time_ms: 1,
          average_difficulty_millis: 1000,
          blocks_count: 1,
          blocks_with_graffiti_count: 1,
          chain_sequence: 1,
          cumulative_unique_graffiti: 1,
          date: new Date('2021-11-16T00:00:00Z'),
          transactions_count: 1,
          unique_graffiti_count: 1,
        },
      });
      await prisma.blockDaily.create({
        data: {
          average_block_time_ms: 1,
          average_difficulty_millis: 1000,
          blocks_count: 1,
          blocks_with_graffiti_count: 1,
          chain_sequence: 1,
          cumulative_unique_graffiti: 1,
          date: new Date('2021-11-17T00:00:00Z'),
          transactions_count: 1,
          unique_graffiti_count: 1,
        },
      });
      await prisma.blockDaily.create({
        data: {
          average_block_time_ms: 1,
          average_difficulty_millis: 1000,
          blocks_count: 1,
          blocks_with_graffiti_count: 1,
          chain_sequence: 1,
          cumulative_unique_graffiti: 1,
          date: new Date('2021-11-18T00:00:00Z'),
          transactions_count: 1,
          unique_graffiti_count: 1,
        },
      });
    };

    it('returns block daily metrics within the time range', async () => {
      await setup();
      const start = new Date('2021-11-16T00:00:00Z');
      const end = new Date('2021-11-18T00:00:00Z');
      const records = await blocksDailyService.list(start, end);

      for (const record of records) {
        expect(record.date.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(record.date.getTime()).toBeLessThan(end.getTime());
      }
    });
  });

  describe('create', () => {
    it('creates a BlockDaily record', async () => {
      const options = {
        averageBlockTimeMs: 0,
        averageDifficultyMillis: 0,
        blocksCount: 0,
        blocksWithGraffitiCount: 0,
        chainSequence: 0,
        cumulativeUniqueGraffiti: 0,
        date: new Date(),
        transactionsCount: 0,
        uniqueGraffiti: 0,
      };

      const blockDaily = await blocksDailyService.create(prisma, options);
      expect(blockDaily).toMatchObject({
        id: expect.any(Number),
        average_block_time_ms: options.averageBlockTimeMs,
        average_difficulty_millis: BigInt(options.averageDifficultyMillis),
        blocks_count: options.blocksCount,
        blocks_with_graffiti_count: options.blocksWithGraffitiCount,
        chain_sequence: options.chainSequence,
        cumulative_unique_graffiti: options.cumulativeUniqueGraffiti,
        date: options.date,
        transactions_count: options.transactionsCount,
        unique_graffiti: options.uniqueGraffiti,
      });
    });
  });
});
