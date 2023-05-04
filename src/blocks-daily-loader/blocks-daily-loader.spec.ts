/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BlocksService } from '../blocks/blocks.service';
import { BlocksDailyService } from '../blocks-daily/blocks-daily.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksDailyLoader } from './blocks-daily-loader';

describe('BlocksDailyLoader', () => {
  let app: INestApplication;
  let blocksDailyLoader: BlocksDailyLoader;
  let blocksDailyService: BlocksDailyService;
  let blocksService: BlocksService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksDailyLoader = app.get(BlocksDailyLoader);
    blocksDailyService = app.get(BlocksDailyService);
    blocksService = app.get(BlocksService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('loadDateMetrics', () => {
    it('fetches date metrics and upserts a new Block Daily record', async () => {
      const date = new Date();
      const mockMetrics = {
        averageBlockTimeMs: 0,
        averageDifficulty: new Prisma.Decimal(0),
        averageBlockSize: new Prisma.Decimal(0),
        blocksCount: 0,
        blocksWithGraffitiCount: 0,
        chainSequence: 0,
        cumulativeUniqueGraffiti: 0,
        transactionsCount: 0,
        uniqueGraffiti: 0,
      };
      const upsert = jest
        .spyOn(blocksDailyService, 'upsert')
        .mockImplementationOnce(jest.fn());
      jest
        .spyOn(blocksService, 'getDateMetrics')
        .mockImplementationOnce(() => Promise.resolve(mockMetrics));

      await blocksDailyLoader.loadDateMetrics(date);

      expect(upsert).toHaveBeenCalledTimes(1);
    });
  });
});
