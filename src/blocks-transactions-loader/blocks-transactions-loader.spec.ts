/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { BlockOperation } from '../blocks/enums/block-operation';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksTransactionsLoader } from './block-transactions-loader';

describe('BlocksTransactionsLoader', () => {
  let app: INestApplication;
  let blocksTransactionsLoader: BlocksTransactionsLoader;
  let blocksTransactionsService: BlocksTransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksTransactionsLoader = app.get(BlocksTransactionsLoader);
    blocksTransactionsService = app.get(BlocksTransactionsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('bulkUpsert', () => {
    describe('when a block with transactions is supplied', () => {
      it('stores a Block, Transaction, and BlockTransaction record', async () => {
        const blockHash = uuid();
        const transaction = {
          hash: uuid(),
          fee: BigInt(9999),
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
              transactions_count: 1,
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
          difficulty: expect.any(Number),
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

        const blockTransaction = await blocksTransactionsService.find(blocks[0].id, blocks[0].transactions[0].id);
        expect(blockTransaction).toMatchObject({
          block_id: blocks[0].id,
          transaction_id: blocks[0].transactions[0].id,
        });
      });
    });
  });
});
