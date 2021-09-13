/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksTransactionsService } from './blocks-transactions.service';

describe('BlocksTransactionsService', () => {
  let app: INestApplication;
  let blocksTransactionsService: BlocksTransactionsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksTransactionsService = app.get(BlocksTransactionsService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const seedBlock = async () => {
    const hash = uuid();
    const sequence = faker.datatype.number();
    const searchable_text = hash + ' ' + String(sequence);

    const block = await prisma.block.create({
      data: {
        hash,
        difficulty: faker.datatype.number(),
        main: true,
        sequence,
        timestamp: new Date(),
        transactions_count: 0,
        graffiti: uuid(),
        previous_block_hash: uuid(),
        network_version: 0,
        searchable_text,
        size: faker.datatype.number(),
      },
    });

    return { block };
  };

  describe('upsert', () => {
    describe('when given a block and transaction', () => {
      it('returns an association of said block and transaction', async () => {
        const { block } = await seedBlock();
        const notes = [{ commitment: uuid() }];
        const spends = [{ nullifier: uuid() }];

        const transaction = await prisma.transaction.create({
          data: {
            hash: uuid(),
            network_version: 0,
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            timestamp: new Date(),
            block_id: block.id,
            notes,
            spends,
          },
        });

        const blocksTransaction = await blocksTransactionsService.upsert(
          block,
          transaction,
        );
        expect(blocksTransaction).toMatchObject({
          block_id: block.id,
          transaction_id: transaction.id,
        });
      });
    });
  });
});
