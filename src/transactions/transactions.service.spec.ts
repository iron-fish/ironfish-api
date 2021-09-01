/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let app: INestApplication;
  let transactionsService: TransactionsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    transactionsService = app.get(TransactionsService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const setupBlockMined = async () => {
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

  describe('bulkUpsert', () => {
    describe('when a hash does not exist for the network version', () => {
      it('stores a transaction record', async () => {
        const { block } = await setupBlockMined();
        const transactions = await transactionsService.bulkUpsert({
          transactions: [
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              timestamp: new Date(),
              block_id: block.id,
              notes: faker.datatype.json(),
              spends: faker.datatype.json(),
            },
          ],
        });
        expect(transactions[0]).toMatchObject({
          id: expect.any(Number),
          hash: expect.any(String),
          fee: expect.any(BigInt),
          size: expect.any(Number),
          timestamp: expect.any(Date),
          block_id: expect.any(Number),
          notes: expect.any(String),
          spends: expect.any(String),
        });
      });
    });

    describe('when a hash does exist for the the network version', () => {
      it('updates the transaction record', async () => {
        const { block } = await setupBlockMined();
        const transactions = await transactionsService.bulkUpsert({
          transactions: [
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              timestamp: new Date(),
              block_id: block.id,
              notes: faker.datatype.json(),
              spends: faker.datatype.json(),
            },
          ],
        });
        const newFee = faker.datatype.number();
        const newSize = faker.datatype.number();
        const newTime = new Date();
        const newNotes = faker.datatype.json();
        const newSpends = faker.datatype.json();
        const transaction = transactions[0];
        const newTransactions = await transactionsService.bulkUpsert({
          transactions: [
            {
              hash: transaction.hash,
              fee: newFee,
              size: newSize,
              timestamp: newTime,
              block_id: block.id,
              notes: newNotes,
              spends: newSpends,
            },
          ],
        });
        expect(newTransactions[0]).toMatchObject({
          id: transaction.id,
          hash: transaction.hash,
          timestamp: newTime,
          block_id: block.id,
          notes: newNotes,
          spends: newSpends,
        });
      });
    });
  });

  describe('find', () => {
    describe('with a valid hash', () => {
      it('returns the transaction with the correct hash', async () => {
        const { block } = await setupBlockMined();
        const testTransactionHash = uuid();
        const transactions = await transactionsService.bulkUpsert({
          transactions: [
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              timestamp: new Date(),
              block_id: block.id,
              notes: faker.datatype.json(),
              spends: faker.datatype.json(),
            },
          ],
        });
        const testTransaction = transactions[0];
        const transaction = await transactionsService.find({
          hash: testTransactionHash,
        });
        expect(transaction).toMatchObject(testTransaction);
      });
    });

    describe('with an invalid hash', () => {
      it('returns null', async () => {
        const { block } = await setupBlockMined();
        await transactionsService.bulkUpsert({
          transactions: [
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              timestamp: new Date(),
              block_id: block.id,
              notes: faker.datatype.json(),
              spends: faker.datatype.json(),
            },
          ],
        });

        const transaction = await transactionsService.find({ hash: uuid() });
        expect(transaction).toBeNull();
      });
    });
  });

  describe('list', () => {
    describe('with a valid partial hash search string', () => {
      it('returns transactions with match(es)', async () => {
        const { block } = await setupBlockMined();
        const testTransactionHash = uuid();
        await transactionsService.bulkUpsert({
          transactions: [
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              timestamp: new Date(),
              block_id: block.id,
              notes: faker.datatype.json(),
              spends: faker.datatype.json(),
            },
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              timestamp: new Date(),
              block_id: block.id,
              notes: faker.datatype.json(),
              spends: faker.datatype.json(),
            },
          ],
        });

        const transactions = await transactionsService.list({
          search: testTransactionHash.slice(0, 5),
        });
        expect(transactions.length).toBeGreaterThan(0);
      });
    });

    describe('with no query parameters', () => {
      it('returns transactions in descending order', async () => {
        const { block } = await setupBlockMined();
        const testTransactionHash = uuid();
        await transactionsService.bulkUpsert({
          transactions: [
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              timestamp: new Date(),
              block_id: block.id,
              notes: faker.datatype.json(),
              spends: faker.datatype.json(),
            },
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              timestamp: new Date(),
              block_id: block.id,
              notes: faker.datatype.json(),
              spends: faker.datatype.json(),
            },
          ],
        });

        const transactions = await transactionsService.list({});
        expect(transactions.length).toBeGreaterThan(0);
        expect(transactions[0].id).toBeGreaterThan(transactions[1].id);
      });
    });
  });
});
