/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlockOperation } from '../blocks/enums/block-operation';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksTransactionsLoader } from './blocks-transactions-loader';

describe('BlocksTransactionsLoader', () => {
  let app: INestApplication;
  let blocksTransactionsLoader: BlocksTransactionsLoader;
  let blocksTransactionsService: BlocksTransactionsService;
  let graphileWorkerService: GraphileWorkerService;

  let addJob: jest.SpyInstance;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksTransactionsLoader = app.get(BlocksTransactionsLoader);
    blocksTransactionsService = app.get(BlocksTransactionsService);
    graphileWorkerService = app.get(GraphileWorkerService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    addJob = jest
      .spyOn(graphileWorkerService, 'addJob')
      .mockImplementationOnce(jest.fn());
  });

  describe('createMany', () => {
    it('stores a Block, Transaction, and BlockTransaction record', async () => {
      const blockHash1 = uuid();
      const blockHash2 = uuid();
      const timestamp1 = new Date();
      const timestamp2 = new Date();

      const transaction = {
        hash: uuid(),
        fee: faker.datatype.number(),
        size: faker.datatype.number(),
        notes: [{ commitment: uuid() }],
        spends: [{ nullifier: uuid() }],
        mints: [],
        burns: [],
      };
      const blocks = await blocksTransactionsLoader.createMany({
        blocks: [
          {
            hash: blockHash1,
            sequence: faker.datatype.number(),
            difficulty: faker.datatype.number(),
            work: faker.datatype.number(),
            timestamp: timestamp1,
            type: BlockOperation.CONNECTED,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            size: faker.datatype.number(),
            transactions: [transaction],
          },
          {
            hash: blockHash2,
            sequence: faker.datatype.number(),
            difficulty: faker.datatype.number(),
            work: faker.datatype.number(),
            timestamp: timestamp2,
            type: BlockOperation.CONNECTED,
            graffiti: uuid(),
            previous_block_hash: blockHash1,
            size: faker.datatype.number(),
            transactions: [transaction],
          },
        ],
      });

      expect(blocks[0]).toMatchObject({
        id: expect.any(Number),
        hash: blockHash1,
        sequence: expect.any(Number),
        difficulty: expect.anything(),
        main: true,
        timestamp: expect.any(Date),
        transactions_count: expect.any(Number),
        graffiti: expect.any(String),
        previous_block_hash: expect.any(String),
        size: expect.any(Number),
        time_since_last_block_ms: null,
      });

      expect(blocks[1]).toMatchObject({
        id: expect.any(Number),
        hash: blockHash2,
        sequence: expect.any(Number),
        difficulty: expect.anything(),
        main: true,
        timestamp: expect.any(Date),
        transactions_count: expect.any(Number),
        graffiti: expect.any(String),
        previous_block_hash: expect.any(String),
        size: expect.any(Number),
        time_since_last_block_ms: timestamp2.getTime() - timestamp1.getTime(),
      });

      expect(blocks[0].transactions[0]).toMatchObject({
        hash: transaction.hash,
        fee: transaction.fee,
        size: transaction.size,
        notes: transaction.notes,
        spends: transaction.spends,
      });

      const blockTransaction = await blocksTransactionsService.find(
        blocks[0].id,
        blocks[0].transactions[0].id,
      );
      expect(blockTransaction).toMatchObject({
        block_id: blocks[0].id,
        transaction_id: blocks[0].transactions[0].id,
      });
    });

    it('queues jobs to sync a daily snapshot and update the native asset', async () => {
      await blocksTransactionsLoader.createMany({
        blocks: [
          {
            hash: uuid(),
            sequence: faker.datatype.number(),
            difficulty: faker.datatype.number(),
            work: faker.datatype.number(),
            timestamp: new Date(),
            type: BlockOperation.CONNECTED,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            size: faker.datatype.number(),
            transactions: [],
          },
        ],
      });

      expect(addJob).toHaveBeenCalledTimes(2);
      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.SYNC_BLOCKS_DAILY,
        {
          date: expect.any(Date),
        },
      );
      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.REFRESH_NATIVE_ASSET_SUPPLY,
        undefined,
        expect.anything(),
      );
    });
  });
});
