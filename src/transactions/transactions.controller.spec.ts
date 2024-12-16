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
              serialized:
                'U3dh76O7TMnEb+KPrRghTyz4G3lHV/BWfogtW59oUSFKACk56Jl3eMY9Ky9c5uc2nBhePgCo0hIM+ednqYAjoA',
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
            serialized: transaction.serialized,
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

  describe('POST /transactions', () => {
    it('uploads bulk transactions', async () => {
      const transaction1 = {
        hash: uuid(),
        fee: faker.datatype.number(),
        size: faker.datatype.number(),
        expiration: faker.datatype.number(),
        notes: [{ commitment: uuid() }],
        spends: [{ nullifier: uuid() }],
        mints: [],
        burns: [],
      };

      const transaction2 = {
        hash: uuid(),
        fee: faker.datatype.number(),
        expiration: faker.datatype.number(),
        size: faker.datatype.number(),
        notes: [{ commitment: uuid() }],
        spends: [{ nullifier: uuid() }],
        mints: [],
        burns: [],
        serialized: 'serialized',
      };

      const API_KEY = 'test';
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${API_KEY}`)
        .send({ transactions: [transaction1, transaction2] })
        .expect(HttpStatus.CREATED);

      const { body: body1 } = await request(app.getHttpServer())
        .get('/transactions/find')
        .query({ hash: transaction1.hash })
        .expect(HttpStatus.OK);

      expect(body1.seen_sequence).toEqual(expect.any(Number));
      expect(body1.notes).toStrictEqual(transaction1.notes);
      expect(body1.spends).toStrictEqual(transaction1.spends);
      expect(body1.hash).toStrictEqual(transaction1.hash);
      expect(body1.expiration).toStrictEqual(transaction1.expiration);
      expect(body1.serialized).toBeNull();

      const { body: body2 } = await request(app.getHttpServer())
        .get('/transactions/find')
        .query({ hash: transaction2.hash })
        .expect(HttpStatus.OK);

      expect(body2.seen_sequence).toEqual(expect.any(Number));
      expect(body2.notes).toStrictEqual(transaction2.notes);
      expect(body2.spends).toStrictEqual(transaction2.spends);
      expect(body2.hash).toStrictEqual(transaction2.hash);
      expect(body2.expiration).toStrictEqual(transaction2.expiration);
      expect(body2.serialized).toBe('serialized');
    });
  });

  it('uploads bulk transactions without expiration or serialized', async () => {
    const transaction1 = {
      hash: uuid(),
      fee: faker.datatype.number(),
      size: faker.datatype.number(),
      notes: [{ commitment: uuid() }],
      spends: [{ nullifier: uuid() }],
      mints: [],
      burns: [],
    };

    const transaction2 = {
      hash: uuid(),
      fee: faker.datatype.number(),
      size: faker.datatype.number(),
      notes: [{ commitment: uuid() }],
      spends: [{ nullifier: uuid() }],
      mints: [],
      burns: [],
    };

    const API_KEY = 'test';
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({ transactions: [transaction1, transaction2] })
      .expect(HttpStatus.CREATED);

    const { body: body1 } = await request(app.getHttpServer())
      .get('/transactions/find')
      .query({ hash: transaction1.hash })
      .expect(HttpStatus.OK);

    expect(body1.notes).toStrictEqual(transaction1.notes);
    expect(body1.spends).toStrictEqual(transaction1.spends);
    expect(body1.hash).toStrictEqual(transaction1.hash);

    const { body: body2 } = await request(app.getHttpServer())
      .get('/transactions/find')
      .query({ hash: transaction2.hash })
      .expect(HttpStatus.OK);

    expect(body2.notes).toStrictEqual(transaction2.notes);
    expect(body2.spends).toStrictEqual(transaction2.spends);
    expect(body2.hash).toStrictEqual(transaction2.hash);
  });
});
