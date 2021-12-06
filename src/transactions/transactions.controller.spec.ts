/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { serializedBlockFromRecord } from '../blocks/utils/block-translator';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { SerializedTransactionWithBlocks } from './interfaces/serialized-transaction-with-blocks';
import { Transaction } from '.prisma/client';

describe('TransactionsController', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
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
        difficulty: faker.datatype.number(),
        main: true,
        sequence,
        timestamp: new Date(),
        transactions_count: 0,
        graffiti: uuid(),
        previous_block_hash: uuid(),
        network_version: 0,
        size: faker.datatype.number(),
      },
    });

    return { block };
  };

  describe('GET /transactions/find', () => {
    describe('with block info requested', () => {
      describe('with a valid hash', () => {
        it('returns the transaction with the correct hash and block', async () => {
          const testTransactionHash = uuid();
          const { block } = await seedBlock();
          const serializedBlock = serializedBlockFromRecord(block);
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          const transaction = await prisma.transaction.create({
            data: {
              hash: testTransactionHash,
              network_version: 0,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          });

          await prisma.blockTransaction.create({
            data: {
              block_id: block.id,
              transaction_id: transaction.id,
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/transactions/find')
            .query({ hash: testTransactionHash, with_blocks: true })
            .expect(HttpStatus.OK);

          expect(body).toMatchObject({
            id: expect.any(Number),
            hash: testTransactionHash,
            fee: expect.any(String),
            size: expect.any(Number),
            notes,
            spends,
          });

          const serializedTransaction = body as SerializedTransactionWithBlocks;
          for (const receivedBlock of serializedTransaction.blocks) {
            expect(receivedBlock.id).toBe(serializedBlock.id);
          }
        });
      });

      describe('with an invalid hash', () => {
        it('returns a 404', async () => {
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

          await prisma.blockTransaction.create({
            data: {
              block_id: block.id,
              transaction_id: transaction.id,
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/transactions/find')
            .query({ hash: uuid(), with_blocks: true })
            .expect(HttpStatus.NOT_FOUND);

          expect(body).toMatchSnapshot();
        });
      });

      describe('with an undefined hash', () => {
        it('returns a 422', async () => {
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

          await prisma.blockTransaction.create({
            data: {
              block_id: block.id,
              transaction_id: transaction.id,
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/transactions/find')
            .query({ with_blocks: true })
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

          expect(body).toMatchSnapshot();
        });
      });
    });

    describe('with block info not requested', () => {
      describe('with a valid hash', () => {
        it('returns the transaction with the correct hash', async () => {
          const testTransactionHash = uuid();
          const { block } = await seedBlock();
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          const transaction = await prisma.transaction.create({
            data: {
              hash: testTransactionHash,
              network_version: 0,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          });

          await prisma.blockTransaction.create({
            data: {
              block_id: block.id,
              transaction_id: transaction.id,
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/transactions/find')
            .query({ hash: testTransactionHash })
            .expect(HttpStatus.OK);

          expect(body).toMatchObject({
            id: expect.any(Number),
            hash: testTransactionHash,
            fee: expect.any(String),
            size: expect.any(Number),
            notes: notes,
            spends: spends,
          });
        });
      });

      describe('with an invalid hash', () => {
        it('returns a 404', async () => {
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

          await prisma.blockTransaction.create({
            data: {
              block_id: block.id,
              transaction_id: transaction.id,
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/transactions/find')
            .query({ hash: uuid() })
            .expect(HttpStatus.NOT_FOUND);

          expect(body).toMatchSnapshot();
        });
      });

      describe('with an undefined hash', () => {
        it('returns a 422', async () => {
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          await prisma.transaction.create({
            data: {
              hash: uuid(),
              network_version: 0,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/transactions/find')
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

          expect(body).toMatchSnapshot();
        });
      });
    });
  });

  describe('GET /transactions', () => {
    describe('with block info requested', () => {
      describe('with a valid partial hash search string', () => {
        it('retuns matching transactions with block info included', async () => {
          const { block } = await seedBlock();
          const serializedBlock = serializedBlockFromRecord(block);
          const testTransactionHash = uuid();
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          const transaction = await prisma.transaction.create({
            data: {
              hash: testTransactionHash,
              network_version: 0,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          });

          await prisma.blockTransaction.create({
            data: {
              block_id: block.id,
              transaction_id: transaction.id,
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/transactions')
            .query({
              search: testTransactionHash.slice(0, 5),
              with_blocks: true,
            })
            .expect(HttpStatus.OK);

          const { data } = body;
          expect((data as unknown[]).length).toBeGreaterThan(0);
          for (const serializedTransaction of data as SerializedTransactionWithBlocks[]) {
            for (const block of serializedTransaction.blocks) {
              expect(block.id).toBe(serializedBlock.id);
            }
          }
        });
      });

      describe('with a block ID', () => {
        it('returns transactions that are part of the block', async () => {
          const { block } = await seedBlock();
          const serializedBlock = serializedBlockFromRecord(block);
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
            await prisma.blockTransaction.create({
              data: {
                block_id: block.id,
                transaction_id: transaction.id,
              },
            });
          }

          const { body } = await request(app.getHttpServer())
            .get('/transactions')
            .query({ block_id: block.id, with_blocks: true })
            .expect(HttpStatus.OK);

          const { data } = body;
          expect((data as unknown[]).length).toBeGreaterThan(0);
          for (const serializedTransaction of data as SerializedTransactionWithBlocks[]) {
            for (const block of serializedTransaction.blocks) {
              expect(block.id).toBe(serializedBlock.id);
            }
          }
        });
      });

      describe('with only block info requested', () => {
        it('retuns transactions in descending order', async () => {
          const { block } = await seedBlock();
          const serializedBlock = serializedBlockFromRecord(block);
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          for (let i = 0; i < 20; i++) {
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

            await prisma.blockTransaction.create({
              data: {
                block_id: block.id,
                transaction_id: transaction.id,
              },
            });
          }

          const { body } = await request(app.getHttpServer())
            .get('/transactions')
            .query({ with_blocks: true })
            .expect(HttpStatus.OK);

          const { data } = body;
          expect((data as unknown[]).length).toBeGreaterThan(19);
          expect(((data as unknown[])[0] as Transaction).id).toBeGreaterThan(
            ((data as unknown[])[1] as Transaction).id,
          );

          for (const serializedTransaction of data as SerializedTransactionWithBlocks[]) {
            for (const receivedBlock of serializedTransaction.blocks) {
              expect(receivedBlock.id).toBe(serializedBlock.id);
            }
          }
        });
      });
    });

    describe('with block info not reqeusted', () => {
      describe('with a valid partial hash search string', () => {
        it('retuns matching transactions', async () => {
          const testTransactionHash = uuid();
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          const transaction = await prisma.transaction.create({
            data: {
              hash: testTransactionHash,
              network_version: 0,
              fee: faker.datatype.number(),
              size: faker.datatype.number(),
              notes,
              spends,
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/transactions')
            .query({ search: testTransactionHash.slice(0, 5) })
            .expect(HttpStatus.OK);

          const { data } = body;
          expect((data as unknown[]).length).toBeGreaterThan(0);
          expect((data as unknown[])[0]).toMatchObject({
            id: expect.any(Number),
            hash: transaction.hash,
            fee: transaction.fee.toString(),
            size: transaction.size,
            notes,
            spends,
          });
        });
      });

      describe('with no query parameters', () => {
        it('retuns transactions in descending order', async () => {
          const notes = [{ commitment: uuid() }];
          const spends = [{ nullifier: uuid() }];
          for (let i = 0; i < 10; i++) {
            await prisma.transaction.create({
              data: {
                hash: uuid(),
                network_version: 0,
                fee: faker.datatype.number(),
                size: faker.datatype.number(),
                notes,
                spends,
              },
            });
          }

          const { body } = await request(app.getHttpServer())
            .get('/transactions')
            .expect(HttpStatus.OK);

          const { data } = body;
          expect((data as unknown[]).length).toBeGreaterThan(10);
          expect((data as unknown[])[0]).toMatchObject({
            id: expect.any(Number),
            hash: expect.any(String),
            fee: expect.any(String),
            size: expect.any(Number),
            notes,
            spends,
          });
          expect(((data as unknown[])[0] as Transaction).id).toBeGreaterThan(
            ((data as unknown[])[1] as Transaction).id,
          );
        });
      });
    });
  });
});
