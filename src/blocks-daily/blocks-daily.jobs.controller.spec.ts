/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlocksService } from '../blocks/blocks.service';
import { BlocksDailyLoader } from '../blocks-daily-loader/blocks-daily-loader';
import { getNextDate } from '../common/utils/date';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksDailyJobsController } from './blocks-daily.jobs.controller';

describe('BlocksDailyJobsController', () => {
  let app: INestApplication;
  let blocksDailyJobsController: BlocksDailyJobsController;
  let blocksDailyLoader: BlocksDailyLoader;
  let blocksService: BlocksService;
  let graphileWorkerService: GraphileWorkerService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksDailyJobsController = app.get(BlocksDailyJobsController);
    blocksDailyLoader = app.get(BlocksDailyLoader);
    blocksService = app.get(BlocksService);
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

    describe('when a day worth of data is not available', () => {
      beforeEach(() => {
        jest.spyOn(blocksService, 'head').mockImplementationOnce(() =>
          Promise.resolve({
            id: 0,
            created_at: new Date(),
            updated_at: new Date(),
            hash: uuid(),
            difficulty: BigInt(faker.datatype.number()),
            main: true,
            sequence: 0,
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            network_version: 0,
            size: faker.datatype.number(),
            delta: faker.datatype.number(),
          }),
        );
      });

      it('does not requeue', async () => {
        const { requeue } = await blocksDailyJobsController.sync({
          date: new Date(),
        });

        expect(requeue).toBe(false);
      });

      it('does not enqueue a job', async () => {
        await blocksDailyJobsController.sync({ date: new Date() });

        expect(addJob).not.toHaveBeenCalled();
      });
    });

    describe('when a day worth of data is available', () => {
      beforeEach(() => {
        jest.spyOn(blocksService, 'head').mockImplementationOnce(() =>
          Promise.resolve({
            id: 0,
            created_at: new Date(),
            updated_at: new Date(),
            hash: uuid(),
            difficulty: BigInt(faker.datatype.number()),
            main: true,
            sequence: 0,
            timestamp: getNextDate(new Date(new Date().getTime() + 10)),
            transactions_count: 0,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            network_version: 0,
            size: faker.datatype.number(),
            delta: faker.datatype.number(),
          }),
        );
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
});
