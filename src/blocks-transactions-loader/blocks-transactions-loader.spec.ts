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
import { UsersService } from '../users/users.service';
import { BlocksTransactionsLoader } from './block-transactions-loader';

describe('BlocksTransactionsLoader', () => {
  let app: INestApplication;
  let blocksTransactionsLoader: BlocksTransactionsLoader;
  let blocksTransactionsService: BlocksTransactionsService;
  let graphileWorkerService: GraphileWorkerService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksTransactionsLoader = app.get(BlocksTransactionsLoader);
    blocksTransactionsService = app.get(BlocksTransactionsService);
    graphileWorkerService = app.get(GraphileWorkerService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkUpsert', () => {
    it('stores a Block, Transaction, and BlockTransaction record', async () => {
      const blockHash = uuid();
      const transaction = {
        hash: uuid(),
        fee: faker.datatype.number(),
        size: faker.datatype.number(),
        notes: [{ commitment: uuid() }],
        spends: [{ nullifier: uuid() }],
      };
      const blocks = await blocksTransactionsLoader.bulkUpsert({
        blocks: [
          {
            hash: blockHash,
            sequence: faker.datatype.number(),
            difficulty: faker.datatype.number(),
            timestamp: new Date(),
            type: BlockOperation.CONNECTED,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            size: faker.datatype.number(),
            transactions: [transaction],
          },
        ],
      });

      expect(blocks[0]).toMatchObject({
        id: expect.any(Number),
        hash: blockHash,
        sequence: expect.any(Number),
        difficulty: expect.any(BigInt),
        main: true,
        timestamp: expect.any(Date),
        transactions_count: expect.any(Number),
        graffiti: expect.any(String),
        previous_block_hash: expect.any(String),
        size: expect.any(Number),
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

    describe('when the blocks are associated with a registered user', () => {
      let addJob: jest.SpyInstance;

      beforeEach(() => {
        addJob = jest
          .spyOn(graphileWorkerService, 'addJob')
          .mockImplementationOnce(jest.fn());
      });

      it('queues delete jobs for disconnected blocks', async () => {
        const graffiti = uuid();
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti,
          country_code: faker.address.countryCode('alpha-3'),
        });
        await usersService.confirm(user);
        const blocks = await blocksTransactionsLoader.bulkUpsert({
          blocks: [
            {
              hash: uuid(),
              sequence: faker.datatype.number(),
              difficulty: faker.datatype.number(),
              timestamp: new Date(),
              type: BlockOperation.DISCONNECTED,
              graffiti,
              previous_block_hash: uuid(),
              size: faker.datatype.number(),
              transactions: [],
            },
          ],
        });

        expect(addJob).toHaveBeenCalledTimes(1);
        expect(addJob).toHaveBeenCalledWith(
          GraphileWorkerPattern.DELETE_BLOCK_MINED_EVENT,
          {
            block_id: blocks[0].id,
            user_id: user.id,
          },
          expect.anything(),
        );
      });

      it('queues upsert jobs for disconnected blocks', async () => {
        const graffiti = uuid();
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti,
          country_code: faker.address.countryCode('alpha-3'),
        });
        await usersService.confirm(user);
        const blocks = await blocksTransactionsLoader.bulkUpsert({
          blocks: [
            {
              hash: uuid(),
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

        expect(addJob).toHaveBeenCalledTimes(1);
        expect(addJob).toHaveBeenCalledWith(
          GraphileWorkerPattern.UPSERT_BLOCK_MINED_EVENT,
          {
            block_id: blocks[0].id,
            user_id: user.id,
          },
          expect.anything(),
        );
      });
    });
  });
});
