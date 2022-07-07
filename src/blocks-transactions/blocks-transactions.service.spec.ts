/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import assert from 'assert';
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

    const block = await prisma.block.create({
      data: {
        hash,
        main: true,
        sequence,
        timestamp: new Date(),
        transactions_count: 0,
        graffiti: uuid(),
        previous_block_hash: uuid(),
        network_version: 0,
        size: faker.datatype.number(),
        difficulty: faker.datatype.number(),
      },
    });

    return { block };
  };

  describe('find', () => {
    describe('with an invalid block id and transaction id', () => {
      it('returns null', async () => {
        expect(await blocksTransactionsService.find(123, 321)).toBeNull();
      });
    });

    describe('with a valid block id and transaction id', () => {
      it('returns the join record', async () => {
        const { block } = await seedBlock();
        const transaction = await prisma.transaction.create({
          data: {
            hash: uuid(),
            network_version: 0,
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            notes: [{ commitment: uuid() }],
            spends: [{ nullifier: uuid() }],
          },
        });
        await blocksTransactionsService.upsert(prisma, block, transaction, 0);

        const record = await blocksTransactionsService.find(
          block.id,
          transaction.id,
        );
        expect(record).not.toBeNull();
        expect(record).toMatchObject({
          block_id: block.id,
          transaction_id: transaction.id,
        });
      });
    });
  });

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
            notes,
            spends,
          },
        });

        const blockTransaction = await blocksTransactionsService.upsert(
          prisma,
          block,
          transaction,
          0,
        );

        expect(blockTransaction).toMatchObject({
          block_id: block.id,
          transaction_id: transaction.id,
        });
      });
    });
  });

  describe('list', () => {
    describe('when given a block ID', () => {
      it('returns BlockTransaction records with matching block IDs', async () => {
        const { block } = await seedBlock();
        const notes = [{ commitment: uuid() }];
        const spends = [{ nullifier: uuid() }];

        for (let i = 0; i < 10; i++) {
          const transaction = await prisma.transaction.create({
            data: {
              hash: uuid(),
              network_version: 0,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          });
          await blocksTransactionsService.upsert(prisma, block, transaction, i);
        }

        const blocksTransactions = await blocksTransactionsService.list({
          blockId: block.id,
        });
        for (const record of blocksTransactions) {
          expect(record.block_id).toBe(block.id);
        }
      });
    });

    describe('when given a transaction ID', () => {
      it('returns BlockTransaction records with matching transaction IDs', async () => {
        const notes = [{ commitment: uuid() }];
        const spends = [{ nullifier: uuid() }];
        const transaction = await prisma.transaction.create({
          data: {
            hash: uuid(),
            network_version: 0,
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            notes,
            spends,
          },
        });

        for (let i = 0; i < 10; i++) {
          const { block } = await seedBlock();
          await blocksTransactionsService.upsert(prisma, block, transaction, i);
        }

        const blocksTransactions = await blocksTransactionsService.list({
          transactionId: transaction.id,
        });

        for (const record of blocksTransactions) {
          expect(record.transaction_id).toBe(transaction.id);
        }
      });
    });
  });

  describe('findBlocksByTransaction', () => {
    it('returns the blocks associated with the transaction', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          hash: uuid(),
          network_version: 0,
          fee: faker.datatype.number(),
          size: faker.datatype.number(),
          notes: [{ commitment: uuid() }],
          spends: [{ nullifier: uuid() }],
        },
      });

      for (let i = 0; i < 10; i++) {
        const { block } = await seedBlock();
        await blocksTransactionsService.upsert(prisma, block, transaction, i);
      }

      const blocks = await blocksTransactionsService.findBlocksByTransaction(
        transaction,
      );
      for (const block of blocks) {
        expect(
          await blocksTransactionsService.find(block.id, transaction.id),
        ).not.toBeNull();
      }
    });
  });

  describe('findTransactionsByBlock', () => {
    it('returns the blocks associated with the transaction', async () => {
      const { block } = await seedBlock();
      for (let i = 0; i < 10; i++) {
        const transaction = await prisma.transaction.create({
          data: {
            hash: uuid(),
            network_version: 0,
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            notes: [{ commitment: uuid() }],
            spends: [{ nullifier: uuid() }],
          },
        });

        const blockTransaction = await blocksTransactionsService.upsert(
          prisma,
          block,
          transaction,
          i,
        );

        expect(blockTransaction.index).toEqual(i);
      }

      const transactions =
        await blocksTransactionsService.findTransactionsByBlock(block);

      for (let i = 0; i < transactions.length; ++i) {
        const transaction = transactions[i];

        const blockTransaction = await blocksTransactionsService.find(
          block.id,
          transaction.id,
        );

        assert.ok(blockTransaction);
        expect(blockTransaction.index).toBe(i);
      }
    });
  });
});
