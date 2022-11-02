/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { standardizeHash } from '../common/utils/hash';
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

  describe('createMany', () => {
    describe('when a hash does not exist for the network version', () => {
      it('stores a transaction record', async () => {
        const notes = [{ commitment: uuid() }];
        const spends = [{ nullifier: uuid() }];
        const hash = faker.random.alpha({ count: 10, upcase: true });
        expect(hash).toEqual(hash.toUpperCase());
        const transactions = await transactionsService.createManyWithClient(
          prisma,
          [
            {
              hash,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ],
        );
        expect(transactions[0]).toMatchObject({
          id: expect.any(Number),
          hash: standardizeHash(hash),
          fee: expect.any(Number),
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
        const transactions = await transactionsService.createManyWithClient(
          prisma,
          [
            {
              hash: uuid(),
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          ],
        );
        const newFee = faker.datatype.number();
        const newSize = faker.datatype.number();
        const newNotes = [{ commitment: uuid() }];
        const newSpends = [{ nullifier: uuid() }];
        const transaction = transactions[0];
        const newTransactions = await transactionsService.createManyWithClient(
          prisma,
          [
            {
              hash: transaction.hash,
              fee: newFee,
              size: newSize,
              notes: newNotes,
              spends: newSpends,
            },
          ],
        );
        expect(newTransactions[0]).toMatchObject({
          id: transaction.id,
          hash: transaction.hash,
          fee: newFee,
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
          const testTransactionHash = faker.random.alpha({
            count: 10,
            upcase: true,
          });
          const transactions = await transactionsService.createManyWithClient(
            prisma,
            [
              {
                hash: testTransactionHash,
                fee: faker.datatype.number(),
                size: faker.datatype.number(),
                notes,
                spends,
              },
            ],
          );
          const testTransaction = transactions[0];

          await blocksTransactionsService.upsert(
            prisma,
            block,
            testTransaction,
            0,
          );

          let receivedTransaction = await transactionsService.find({
            hash: testTransactionHash.toLowerCase(),
            withBlocks: true,
          });
          expect(receivedTransaction).toMatchObject(testTransaction);
          let transaction = receivedTransaction as Transaction & {
            blocks: Block[];
          };
          expect(transaction.blocks).toContainEqual(block);

          receivedTransaction = await transactionsService.find({
            hash: testTransactionHash.toUpperCase(),
            withBlocks: true,
          });
          expect(receivedTransaction).toMatchObject(testTransaction);
          transaction = receivedTransaction as Transaction & {
            blocks: Block[];
          };
          expect(transaction.blocks).toContainEqual(block);
        });
      });

      describe('with an invalid hash', () => {
        it('returns null', async () => {
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          await transactionsService.createManyWithClient(prisma, [
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
          const transactions = await transactionsService.createManyWithClient(
            prisma,
            [
              {
                hash: testTransactionHash,
                fee: faker.datatype.number(),
                size: faker.datatype.number(),
                notes,
                spends,
              },
            ],
          );
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
          await transactionsService.createManyWithClient(prisma, [
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
      it('returns transactions in descending order with blocks included', async () => {
        const { block } = await seedBlock();
        const testTransactionHash = uuid();
        const notes = [{ commitment: uuid() }];
        const spends = [{ nullifier: uuid() }];
        const transactions = await transactionsService.createManyWithClient(
          prisma,
          [
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
          ],
        );

        for (let i = 0; i < transactions.length; ++i) {
          const transaction = transactions[i];
          await blocksTransactionsService.upsert(prisma, block, transaction, i);
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

    describe('with block info not requested', () => {
      it('returns transactions in descending order', async () => {
        const testTransactionHash = uuid();
        const notes = [{ commitment: uuid() }];
        const spends = [{ nullifier: uuid() }];
        await transactionsService.createManyWithClient(prisma, [
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
