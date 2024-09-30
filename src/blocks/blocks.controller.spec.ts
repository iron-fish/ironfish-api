/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Block, Prisma } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { BlocksDailyService } from '../blocks-daily/blocks-daily.service';
import { MetricsGranularity } from '../common/enums/metrics-granularity';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksService } from './blocks.service';
import { BlockDto, UpsertBlocksDto } from './dto/upsert-blocks.dto';
import { BlockOperation } from './enums/block-operation';
import { SerializedBlockWithTransactions } from './interfaces/serialized-block-with-transactions';

const API_KEY = 'test';

describe('BlocksController', () => {
  let app: INestApplication;
  let blocksDailyService: BlocksDailyService;
  let blocksService: BlocksService;
  let graphileWorkerService: GraphileWorkerService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksDailyService = app.get(BlocksDailyService);
    blocksService = app.get(BlocksService);
    graphileWorkerService = app.get(GraphileWorkerService);
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

  describe('POST /blocks', () => {
    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/blocks`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/blocks`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ blocks: [{}] })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with too many blocks', () => {
      it('returns a 422', async () => {
        const blocks: BlockDto[] = [];
        for (let i = 0; i < 3001; i++) {
          blocks.push({
            hash: uuid(),
            difficulty: faker.datatype.number(),
            work: faker.datatype.number(),
            type: BlockOperation.CONNECTED,
            sequence: faker.datatype.number(),
            timestamp: new Date(),
            graffiti: uuid(),
            previous_block_hash: uuid(),
            size: faker.datatype.number({ min: 1 }),
            transactions: [
              {
                hash: uuid(),
                fee: faker.datatype.number(),
                size: faker.datatype.number(),
                notes: [{ commitment: uuid() }],
                spends: [{ nullifier: uuid() }],
                mints: [],
                burns: [],
              },
            ],
          });
        }
        const payload: UpsertBlocksDto = { blocks };

        const { body } = await request(app.getHttpServer())
          .post(`/blocks`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send(payload)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid payload', () => {
      it('upserts blocks', async () => {
        jest
          .spyOn(graphileWorkerService, 'addJob')
          .mockImplementationOnce(jest.fn());
        const payload: UpsertBlocksDto = {
          blocks: [
            {
              hash: uuid(),
              difficulty: faker.datatype.number(),
              work: faker.datatype.number(),
              type: BlockOperation.CONNECTED,
              sequence: faker.datatype.number(),
              timestamp: new Date(),
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
                  mints: [],
                  burns: [],
                },
              ],
            },
          ],
        };
        const block = payload.blocks[0];
        const { body } = await request(app.getHttpServer())
          .post(`/blocks`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send(payload)
          .expect(HttpStatus.CREATED);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          hash: block.hash,
          difficulty: block.difficulty,
          sequence: block.sequence,
          timestamp: block.timestamp.toISOString(),
          transactions_count: 1,
          previous_block_hash: block.previous_block_hash,
          size: block.size,
        });
      });
    });
  });

  describe('GET /blocks/head', () => {
    it('returns the heaviest block', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/blocks/head')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        id: expect.any(Number),
        main: true,
        hash_rate: expect.any(Number),
        reward: expect.any(String),
        circulating_supply: expect.any(Number),
        total_supply: expect.any(Number),
      });
    });
  });

  describe('GET /blocks', () => {
    describe('with no query parameters', () => {
      it('returns a list of blocks in descending order', async () => {
        for (let i = 0; i < 10; i++) {
          const hash = uuid();
          const testGraffiti = `graffiti ${i}`;
          await prisma.block.create({
            data: {
              hash,
              main: true,
              sequence: i,
              timestamp: new Date(),
              transactions_count: 0,
              graffiti: testGraffiti,
              previous_block_hash: uuid(),
              network_version: 0,
              size: faker.datatype.number(),
              difficulty: faker.datatype.number(),
            },
          });
        }
        const { body } = await request(app.getHttpServer())
          .get('/blocks')
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThanOrEqual(10);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          hash: expect.any(String),
          difficulty: expect.any(Number),
          sequence: expect.any(Number),
          timestamp: expect.any(String),
          transactions_count: expect.any(Number),
          previous_block_hash: expect.any(String),
          size: expect.any(Number),
        });
        expect(((data as unknown[])[0] as Block).id).toBeGreaterThan(
          ((data as unknown[])[1] as Block).id,
        );
      });

      describe('with main chain parameter set to false', () => {
        it('returns only non-main chain blocks', async () => {
          for (let i = 0; i < 10; i++) {
            const hash = uuid();
            const testGraffiti = `graffiti ${i}`;
            await prisma.block.create({
              data: {
                hash,
                main: i < 5,
                sequence: i,
                timestamp: new Date(),
                transactions_count: 0,
                graffiti: testGraffiti,
                previous_block_hash: uuid(),
                network_version: 0,
                size: faker.datatype.number(),
                difficulty: faker.datatype.number(),
              },
            });
          }

          const { body } = await request(app.getHttpServer())
            .get('/blocks')
            .query({ main: false })
            .expect(HttpStatus.OK);

          const { data } = body;
          expect((data as unknown[]).length).toBeGreaterThanOrEqual(5);
          expect((data as unknown[])[0]).toMatchObject({
            id: expect.any(Number),
            hash: expect.any(String),
            difficulty: expect.any(Number),
            main: false,
            sequence: expect.any(Number),
            timestamp: expect.any(String),
            transactions_count: expect.any(Number),
            previous_block_hash: expect.any(String),
            size: expect.any(Number),
          });
        });
      });
    });

    describe('with invalid sequence_gte and sequence_lt parameters', () => {
      describe('when sequence_gte and sequence_lt are not at least 1', () => {
        it('returns a 422', async () => {
          const { body } = await request(app.getHttpServer())
            .get('/blocks')
            .query({ sequence_gte: -1, sequence_lt: -1 })
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

          expect(body).toMatchSnapshot();
        });
      });

      describe('when sequence_gte > sequence_lt', () => {
        it('returns a 422', async () => {
          const { body } = await request(app.getHttpServer())
            .get('/blocks')
            .query({ sequence_gte: 2, sequence_lt: 1 })
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

          expect(body).toMatchSnapshot();
        });
      });

      describe('when the range is too long', () => {
        it('returns a 422', async () => {
          const { body } = await request(app.getHttpServer())
            .get('/blocks')
            .query({ sequence_gte: 1, sequence_lt: 1002 })
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

          expect(body).toMatchSnapshot();
        });
      });
    });

    describe('with a valid sequence range', () => {
      it('returns blocks within the range', async () => {
        // Seed some blocks
        for (let i = 0; i < 10; i++) {
          const hash = uuid();
          const testGraffiti = `graffiti ${i}`;
          await prisma.block.create({
            data: {
              hash,
              main: true,
              sequence: i,
              timestamp: new Date(),
              transactions_count: 0,
              graffiti: testGraffiti,
              previous_block_hash: uuid(),
              network_version: 0,
              size: faker.datatype.number(),
              difficulty: faker.datatype.number(),
            },
          });
        }

        const { body } = await request(app.getHttpServer())
          .get('/blocks')
          .query({ sequence_gte: 1, sequence_lt: 420 })
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          hash: expect.any(String),
          difficulty: expect.any(Number),
          sequence: expect.any(Number),
          timestamp: expect.any(String),
          transactions_count: expect.any(Number),
          previous_block_hash: expect.any(String),
          size: expect.any(Number),
        });
      });
    });

    describe('with search parameters', () => {
      describe('when string is a valid partial hash', () => {
        it('returns block(s) with a match', async () => {
          const testBlockHash = uuid();
          const testSequence = faker.datatype.number();
          const testGraffiti = `graffiti ${testSequence}`;
          await prisma.block.create({
            data: {
              hash: testBlockHash,
              main: true,
              sequence: testSequence,
              timestamp: new Date(),
              transactions_count: 0,
              graffiti: testGraffiti,
              previous_block_hash: uuid(),
              network_version: 0,
              size: faker.datatype.number(),
              difficulty: faker.datatype.number(),
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/blocks')
            .query({ search: testBlockHash })
            .expect(HttpStatus.OK);

          const { data } = body;
          expect((data as unknown[]).length).toBeGreaterThan(0);
          expect((data as unknown[])[0]).toMatchObject({
            id: expect.any(Number),
            hash: testBlockHash,
            difficulty: expect.any(Number),
            sequence: expect.any(Number),
            timestamp: expect.any(String),
            transactions_count: expect.any(Number),
            previous_block_hash: expect.any(String),
            size: expect.any(Number),
          });
        });
      });

      describe('when string is a valid sequence', () => {
        it('returns block(s) with a match', async () => {
          const testBlockHash = uuid();
          const testSequence = 12345;
          const testGraffiti = `graffiti ${testSequence}`;
          await prisma.block.create({
            data: {
              hash: testBlockHash,
              main: true,
              sequence: testSequence,
              timestamp: new Date(),
              transactions_count: 0,
              graffiti: testGraffiti,
              previous_block_hash: uuid(),
              network_version: 0,
              size: faker.datatype.number(),
              difficulty: faker.datatype.number(),
            },
          });

          const { body } = await request(app.getHttpServer())
            .get('/blocks')
            .query({ search: testSequence })
            .expect(HttpStatus.OK);

          const { data } = body;
          expect((data as unknown[]).length).toBeGreaterThan(0);
          expect((data as unknown[])[0]).toMatchObject({
            id: expect.any(Number),
            hash: expect.any(String),
            difficulty: expect.any(Number),
            sequence: testSequence,
            timestamp: expect.any(String),
            transactions_count: expect.any(Number),
            previous_block_hash: expect.any(String),
            size: expect.any(Number),
          });
        });
      });
    });

    describe('with a transaction ID', () => {
      it('returns block(s) that contain said transaction', async () => {
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
        for (let i = 0; i < 9; i++) {
          const { block } = await seedBlock();
          await prisma.blockTransaction.create({
            data: {
              block_id: block.id,
              transaction_id: transaction.id,
            },
          });
        }

        const { body } = await request(app.getHttpServer())
          .get('/blocks')
          .query({ transaction_id: transaction.id, with_transactions: true })
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        for (const serializedBlock of data as SerializedBlockWithTransactions[]) {
          for (const tx of serializedBlock.transactions) {
            expect(tx.id).toBe(transaction.id);
          }
        }
      });
    });
  });

  describe('GET /blocks/find', () => {
    describe('with a valid hash', () => {
      it('returns the block with the correct hash', async () => {
        const testBlockHash = uuid();
        const testSequence = faker.datatype.number();
        const testGraffiti = `graffiti ${testSequence}`;
        await prisma.block.create({
          data: {
            hash: testBlockHash,
            main: true,
            sequence: faker.datatype.number(),
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: testGraffiti,
            previous_block_hash: uuid(),
            network_version: 0,
            size: faker.datatype.number(),
            difficulty: faker.datatype.number(),
          },
        });

        const { body } = await request(app.getHttpServer())
          .get('/blocks/find')
          .query({ hash: testBlockHash })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: expect.any(Number),
          hash: testBlockHash,
          difficulty: expect.any(Number),
          sequence: expect.any(Number),
          timestamp: expect.any(String),
          transactions_count: expect.any(Number),
          previous_block_hash: expect.any(String),
          size: expect.any(Number),
        });
      });
    });

    describe('with a valid sequence', () => {
      it('returns the block with the correct sequence', async () => {
        const hash = uuid();
        const testBlockSequence = faker.datatype.number();
        const testGraffiti = `graffiti ${testBlockSequence}`;
        await prisma.block.create({
          data: {
            hash,
            main: true,
            sequence: testBlockSequence,
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: testGraffiti,
            previous_block_hash: uuid(),
            network_version: 0,
            size: faker.datatype.number(),
            difficulty: faker.datatype.number(),
          },
        });

        const { body } = await request(app.getHttpServer())
          .get('/blocks/find')
          .query({ sequence: testBlockSequence })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: expect.any(Number),
          hash: expect.any(String),
          difficulty: expect.any(Number),
          sequence: testBlockSequence,
          timestamp: expect.any(String),
          transactions_count: expect.any(Number),
          previous_block_hash: expect.any(String),
          size: expect.any(Number),
        });
      });
    });

    describe('with neither a matching hash nor sequence', () => {
      it('returns a 404', async () => {
        const hash = uuid();
        const sequence = faker.datatype.number();
        const testGraffiti = `graffiti ${sequence}`;

        await prisma.block.create({
          data: {
            hash,
            main: true,
            sequence,
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: testGraffiti,
            previous_block_hash: uuid(),
            network_version: 0,
            size: faker.datatype.number(),
            difficulty: faker.datatype.number(),
          },
        });

        const { body } = await request(app.getHttpServer())
          .get('/blocks/find')
          .query({ hash: uuid(), sequence: faker.datatype.number() })
          .expect(HttpStatus.NOT_FOUND);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with neither a valid hash nor sequence', () => {
      it('returns a 422', async () => {
        const hash = uuid();
        const sequence = faker.datatype.number();
        const testGraffiti = `graffiti ${sequence}`;
        await prisma.block.create({
          data: {
            hash,
            main: true,
            sequence,
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: testGraffiti,
            previous_block_hash: uuid(),
            network_version: 0,
            size: faker.datatype.number(),
            difficulty: faker.datatype.number(),
          },
        });

        const { body } = await request(app.getHttpServer())
          .get('/blocks/find')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });
  });

  describe('POST /blocks/disconnect', () => {
    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/blocks/disconnect`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/blocks/disconnect`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('wtih a valid sequence', () => {
      it('disconnects blocks after the sequence', async () => {
        const disconnectAfter = jest.spyOn(blocksService, 'disconnectAfter');
        const sequenceGt = 2;
        await request(app.getHttpServer())
          .post(`/blocks/disconnect`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ sequence_gt: sequenceGt })
          .expect(HttpStatus.OK);

        expect(disconnectAfter).toHaveBeenCalledWith(sequenceGt);
      });
    });
  });

  describe('GET /blocks/metrics', () => {
    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/blocks/metrics')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with invalid granularity', () => {
      it('returns a 422', async () => {
        const start = '2021-06-01T00:00:00.000Z';
        const end = '2021-07-01T00:00:00.000Z';
        const { body } = await request(app.getHttpServer())
          .get('/blocks/metrics')
          .query({ start, end, granularity: MetricsGranularity.LIFETIME })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with start after end', () => {
      it('returns a 422', async () => {
        const start = new Date().toISOString();
        const end = new Date(Date.now() - 1).toISOString();
        const { body } = await request(app.getHttpServer())
          .get('/blocks/metrics')
          .query({
            start,
            end,
            granularity: MetricsGranularity.DAY,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a time range longer than the supported range', () => {
      it('returns a 422', async () => {
        const start = '2021-06-01T00:00:00.000Z';
        const end = '2021-10-01T00:00:00.000Z';
        const { body } = await request(app.getHttpServer())
          .get('/blocks/metrics')
          .query({
            start,
            end,
            granularity: MetricsGranularity.DAY,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid request', () => {
      it('returns daily snapshots', async () => {
        const start = '2021-06-01T00:00:00.000Z';
        const end = '2021-07-01T00:00:00.000Z';
        await blocksDailyService.upsert({
          averageBlockTimeMs: 0,
          averageDifficulty: new Prisma.Decimal(0),
          averageBlockSize: new Prisma.Decimal(0),
          blocksCount: 0,
          blocksWithGraffitiCount: 0,
          chainSequence: 0,
          cumulativeUniqueGraffiti: 0,
          date: new Date(start),
          transactionsCount: 0,
          uniqueGraffiti: 0,
        });

        const { body } = await request(app.getHttpServer())
          .get('/blocks/metrics')
          .query({
            start,
            end,
            granularity: MetricsGranularity.DAY,
          })
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          object: 'block_metrics',
          average_block_time_ms: expect.any(Number),
          average_difficulty: expect.any(Number),
          blocks_count: expect.any(Number),
          blocks_with_graffiti_count: expect.any(Number),
          chain_sequence: expect.any(Number),
          cumulative_unique_graffiti: expect.any(Number),
          date: expect.any(String),
          transactions_count: expect.any(Number),
          unique_graffiti_count: expect.any(Number),
        });
      });
    });
  });
});
