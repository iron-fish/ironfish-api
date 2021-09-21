/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlockOperation } from '../blocks/enums/block-operation';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksTransactionsLoaderService } from './block-transactions-loader.service';

describe('BlocksTransactionsLoaderService', () => {
  let app: INestApplication;
  let blocksTransactionsLoaderService: BlocksTransactionsLoaderService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksTransactionsLoaderService = app.get(BlocksTransactionsLoaderService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('bulkUpsert', () => {
    describe('when a block with transactions is supplied', () => {
      it('stores a block, transaction, and BlockTransaction record', async () => {
        const testHash = uuid();
        const blocks = await blocksTransactionsLoaderService.bulkUpsert({
          blocks: [
            {
              hash: testHash,
              sequence: faker.datatype.number(),
              difficulty: faker.datatype.number(),
              timestamp: new Date(),
              transactions_count: 1,
              type: BlockOperation.CONNECTED,
              graffiti: uuid(),
              previous_block_hash: uuid(),
              size: faker.datatype.number(),
              transactions: [
                {
                  hash: uuid(),
                  fee: faker.datatype.number(),
                  size: faker.datatype.number(),
                  notes: [{ commitment: uuid() }],
                  spends: [{ nullifier: uuid() }],
                },
              ],
            },
          ],
        });

        expect(blocks[0]).toMatchObject({
          id: expect.any(Number),
          hash: testHash,
          sequence: expect.any(Number),
          difficulty: expect.any(Number),
          main: true,
          timestamp: expect.any(Date),
          transactions_count: expect.any(Number),
          graffiti: expect.any(String),
          previous_block_hash: expect.any(String),
          size: expect.any(Number),
        });
      });
    });
  });
});
