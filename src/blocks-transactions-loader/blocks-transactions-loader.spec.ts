/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlockOperation } from '../blocks/enums/block-operation';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { BlocksTransactionsLoader } from './blocks-transactions-loader';

describe('BlocksTransactionsLoader', () => {
  let app: INestApplication;
  let blocksTransactionsLoader: BlocksTransactionsLoader;
  let blocksTransactionsService: BlocksTransactionsService;
  let graphileWorkerService: GraphileWorkerService;
  let prismaService: PrismaService;
  let usersService: UsersService;

  let addJob: jest.SpyInstance;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksTransactionsLoader = app.get(BlocksTransactionsLoader);
    blocksTransactionsService = app.get(BlocksTransactionsService);
    graphileWorkerService = app.get(GraphileWorkerService);
    prismaService = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    addJob = jest
      .spyOn(graphileWorkerService, 'addJob')
      .mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkUpsert', () => {
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
      };
      await blocksTransactionsLoader.bulkUpsert({
        blocks: [
          {
            hash: blockHash1,
            sequence: faker.datatype.number(),
            difficulty: faker.datatype.number(),
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
            timestamp: timestamp2,
            type: BlockOperation.CONNECTED,
            graffiti: uuid(),
            previous_block_hash: blockHash1,
            size: faker.datatype.number(),
            transactions: [transaction],
          },
        ],
      });

      const block1 = await prismaService.block.findFirst({
        where: {
          hash: blockHash1,
        },
      });
      assert(block1);
      expect(block1).toMatchObject({
        id: expect.any(Number),
        hash: blockHash1,
        sequence: expect.any(Number),
        difficulty: expect.any(BigInt),
        main: true,
        timestamp: expect.any(Date),
        transactions_count: expect.any(Number),
        graffiti: expect.any(String),
        previous_block_hash: expect.any(String),
        size: expect.any(Number),
        time_since_last_block_ms: null,
      });

      const block2 = await prismaService.block.findFirst({
        where: {
          hash: blockHash2,
        },
      });
      assert(block2);
      expect(block2).toMatchObject({
        id: expect.any(Number),
        hash: blockHash2,
        sequence: expect.any(Number),
        difficulty: expect.any(BigInt),
        main: true,
        timestamp: expect.any(Date),
        transactions_count: expect.any(Number),
        graffiti: expect.any(String),
        previous_block_hash: expect.any(String),
        size: expect.any(Number),
        time_since_last_block_ms: timestamp2.getTime() - timestamp1.getTime(),
      });

      const tx1 = await prismaService.transaction.findFirst({
        where: {
          hash: transaction.hash,
        },
      });
      assert(tx1);
      expect(tx1).toMatchObject({
        hash: transaction.hash,
        fee: transaction.fee,
        size: transaction.size,
        notes: transaction.notes,
        spends: transaction.spends,
      });

      const blockTransaction = await blocksTransactionsService.find(
        block1.id,
        tx1.id,
      );
      expect(blockTransaction).toMatchObject({
        block_id: block1.id,
        transaction_id: tx1.id,
      });
    });

    describe('when the blocks are associated with a registered user', () => {
      it('queues delete jobs for disconnected blocks', async () => {
        const blockHash = uuid();
        const graffiti = uuid();
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti,
          country_code: faker.address.countryCode('alpha-3'),
        });
        await blocksTransactionsLoader.bulkUpsert({
          blocks: [
            {
              hash: blockHash,
              sequence: faker.datatype.number(),
              difficulty: faker.datatype.number(),
              timestamp: new Date(),
              type: BlockOperation.DISCONNECTED,
              graffiti: user.graffiti,
              previous_block_hash: uuid(),
              size: faker.datatype.number(),
              transactions: [],
            },
          ],
        });

        const block = await prismaService.block.findFirst({
          where: {
            hash: blockHash,
          },
        });
        assert(block);
        expect(addJob).toHaveBeenCalledTimes(2);
        expect(addJob).toHaveBeenCalledWith(
          GraphileWorkerPattern.DELETE_BLOCK_MINED_EVENT,
          {
            block_id: block.id,
          },
          expect.anything(),
        );
      });

      it('queues upsert jobs for disconnected blocks', async () => {
        const blockHash = uuid();
        const graffiti = uuid();
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti,
          country_code: faker.address.countryCode('alpha-3'),
        });
        await blocksTransactionsLoader.bulkUpsert({
          blocks: [
            {
              hash: blockHash,
              sequence: faker.datatype.number(),
              difficulty: faker.datatype.number(),
              timestamp: new Date(),
              type: BlockOperation.CONNECTED,
              graffiti,
              previous_block_hash: uuid(),
              size: faker.datatype.number(),
              transactions: [],
            },
          ],
        });

        const block = await prismaService.block.findFirst({
          where: {
            hash: blockHash,
          },
        });
        assert(block);
        expect(addJob).toHaveBeenCalledTimes(2);
        expect(addJob).toHaveBeenCalledWith(
          GraphileWorkerPattern.UPSERT_BLOCK_MINED_EVENT,
          {
            block_id: block.id,
            user_id: user.id,
          },
          expect.anything(),
        );
      });

      it('queues a job to sync a daily snapshot', async () => {
        await blocksTransactionsLoader.bulkUpsert({
          blocks: [
            {
              hash: uuid(),
              sequence: faker.datatype.number(),
              difficulty: faker.datatype.number(),
              timestamp: new Date(),
              type: BlockOperation.CONNECTED,
              graffiti: uuid(),
              previous_block_hash: uuid(),
              size: faker.datatype.number(),
              transactions: [],
            },
          ],
        });

        expect(addJob).toHaveBeenCalledTimes(1);
        expect(addJob).toHaveBeenCalledWith(
          GraphileWorkerPattern.SYNC_BLOCKS_DAILY,
          {
            date: expect.any(Date),
          },
        );
      });
    });
  });
});
