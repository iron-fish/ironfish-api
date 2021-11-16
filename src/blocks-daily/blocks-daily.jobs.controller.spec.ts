/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { BlocksDailyLoader } from '../blocks-daily-loader/blocks-daily-loader';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksDailyJobsController } from './blocks-daily.jobs.controller';

describe('BlocksDailyJobsController', () => {
  let app: INestApplication;
  let blocksDailyJobsController: BlocksDailyJobsController;
  let blocksDailyLoader: BlocksDailyLoader;
  let graphileWorkerService: GraphileWorkerService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksDailyJobsController = app.get(BlocksDailyJobsController);
    blocksDailyLoader = app.get(BlocksDailyLoader);
    graphileWorkerService = app.get(GraphileWorkerService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('sync', () => {
    let addJob: jest.SpyInstance;

    beforeEach(() => {
      addJob = jest
        .spyOn(graphileWorkerService, 'addJob')
        .mockImplementationOnce(jest.fn());
    });

    it('enqueues the next job to sync daily metrics', async () => {
      jest
        .spyOn(blocksDailyLoader, 'loadDateMetrics')
        .mockImplementationOnce(jest.fn());

      await blocksDailyJobsController.sync({ date: new Date() });

      expect(addJob).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(addJob.mock.calls[0][0]).toBe(
        GraphileWorkerPattern.SYNC_BLOCKS_DAILY,
      );
    });

    it('loads daily metrics', async () => {
      const loadDateMetrics = jest
        .spyOn(blocksDailyLoader, 'loadDateMetrics')
        .mockImplementationOnce(jest.fn());
      const date = new Date();

      await blocksDailyJobsController.sync({ date });

      expect(loadDateMetrics).toHaveBeenCalledWith(date);
    });

    it('does not requeue', async () => {
      jest
        .spyOn(blocksDailyLoader, 'loadDateMetrics')
        .mockImplementationOnce(jest.fn());

      const { requeue } = await blocksDailyJobsController.sync({
        date: new Date(),
      });

      expect(requeue).toBe(false);
    });
  });
});
