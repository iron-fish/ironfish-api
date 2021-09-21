/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from './transactions.service';
import { Block, Transaction } from '.prisma/client';

describe('TransactionsService', () => {
  let app: INestApplication;
  let transactionsService: TransactionsService;
  let prisma: PrismaService;
  let blocksTransactionsService: BlocksTransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    transactionsService = app.get(TransactionsService);
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

  describe('bulkUpsert', () => {
    describe('when a hash does not exist for the network version', () => {
      it('stores a transaction record', async () => {
        const notes = [{ commitment: uuid() }];
        const spends = [{ nullifier: uuid() }];
        const transactions = await transactionsService.bulkUpsert([
          {
            hash: uuid(),
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            notes,
            spends,
          },
        ]);
        expect(transactions[0]).toMatchObject({
          id: expect.any(Number),
          hash: expect.any(String),
          fee: expect.any(BigInt),
          size: expect.any(Number),
          notes: notes,
          spends: spends,
        });
      });
    });

    describe('when a hash does exist for the the network version', () => {
      it('updates the transaction record', async () => {
        const notes = [{ commitment: uuid() }];
        const spends = [{ nullifier: uuid() }];
        const transactions = await transactionsService.bulkUpsert([
          {
            hash: uuid(),
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            notes,
            spends,
          },
        ]);
        const newFee = faker.datatype.number();
        const newSize = faker.datatype.number();
        const newNotes = [{ commitment: uuid() }];
        const newSpends = [{ nullifier: uuid() }];
        const transaction = transactions[0];
        const newTransactions = await transactionsService.bulkUpsert([
          {
            hash: transaction.hash,
            fee: newFee,
            size: newSize,
            notes: newNotes,
            spends: newSpends,
          },
        ]);
        expect(newTransactions[0]).toMatchObject({
          id: transaction.id,
          hash: transaction.hash,
          fee: BigInt(newFee),
          size: newSize,
          notes: newNotes,
          spends: newSpends,
        });
      });
    });
  });

  describe('find', () => {
    describe('with block info requested', () => {
      describe('with a valid hash', () => {
        it('returns the transaction with the correct hash and block', async () => {
          const { block } = await seedBlock();
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          const testTransactionHash = uuid();
          const transactions = await transactionsService.bulkUpsert([
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ]);
          const testTransaction = transactions[0];

          await blocksTransactionsService.upsert(block, testTransaction);

          const receivedTransaction = await transactionsService.find({
            hash: testTransactionHash,
            withBlocks: true,
          });

          expect(receivedTransaction).toMatchObject(testTransaction);
          const transaction = receivedTransaction as Transaction & {
            blocks: Block[];
          };
          expect(transaction.blocks).toContainEqual(block);
        });
      });

      describe('with an invalid hash', () => {
        it('returns null', async () => {
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          await transactionsService.bulkUpsert([
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ]);

          const transaction = await transactionsService.find({
            hash: uuid(),
            withBlocks: true,
          });
          expect(transaction).toBeNull();
        });
      });
    });

    describe('with block info not requested', () => {
      describe('with a valid hash', () => {
        it('returns the transaction with the correct hash', async () => {
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          const testTransactionHash = uuid();
          const transactions = await transactionsService.bulkUpsert([
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ]);
          const testTransaction = transactions[0];
          const transaction = await transactionsService.find({
            hash: testTransactionHash,
          });
          expect(transaction).toMatchObject(testTransaction);
        });
      });

      describe('with an invalid hash', () => {
        it('returns null', async () => {
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          await transactionsService.bulkUpsert([
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ]);

          const transaction = await transactionsService.find({ hash: uuid() });
          expect(transaction).toBeNull();
        });
      });
    });
  });

  describe('list', () => {
    describe('with block info requested', () => {
      describe('with a valid partial hash search string', () => {
        it('returns transactions with match(es) with blocks included', async () => {
          const { block } = await seedBlock();
          const testTransactionHash = uuid();
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          const transactions = await transactionsService.bulkUpsert([
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ]);

          for (const transaction of transactions) {
            await blocksTransactionsService.upsert(block, transaction);
          }

          const receivedTransactions = await transactionsService.list({
            search: testTransactionHash.slice(0, 5),
            withBlocks: true,
          });
          expect(receivedTransactions.length).toBeGreaterThan(0);
          const testTransaction = receivedTransactions[0] as Transaction & {
            blocks: Block[];
          };
          expect(testTransaction.blocks).toContainEqual(block);
        });
      });

      describe('with only block info requested', () => {
        it('returns transactions in descending order with blocks included', async () => {
          const { block } = await seedBlock();
          const testTransactionHash = uuid();
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          const transactions = await transactionsService.bulkUpsert([
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ]);

          for (const transaction of transactions) {
            await blocksTransactionsService.upsert(block, transaction);
          }

          const receivedTransactions = await transactionsService.list({
            withBlocks: true,
          });

          expect(receivedTransactions.length).toBeGreaterThan(0);
          expect(receivedTransactions[0].id).toBeGreaterThan(
            receivedTransactions[1].id,
          );
          const testTransaction = receivedTransactions[0] as Transaction & {
            blocks: Block[];
          };
          expect(testTransaction.blocks).toContainEqual(block);
        });
      });
    });

    describe('with block info not requested', () => {
      describe('with a valid partial hash search string', () => {
        it('returns transactions with match(es)', async () => {
          const testTransactionHash = uuid();
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          await transactionsService.bulkUpsert([
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ]);

          const transactions = await transactionsService.list({
            search: testTransactionHash.slice(0, 5),
          });
          expect(transactions.length).toBeGreaterThan(0);
        });
      });

      describe('with no query parameters', () => {
        it('returns transactions in descending order', async () => {
          const testTransactionHash = uuid();
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          await transactionsService.bulkUpsert([
            {
              hash: testTransactionHash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ]);

          const transactions = await transactionsService.list({});
          expect(transactions.length).toBeGreaterThan(0);
          expect(transactions[0].id).toBeGreaterThan(transactions[1].id);
        });
      });
    });
  });
});
