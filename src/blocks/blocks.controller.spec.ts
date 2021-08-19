/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { BlocksService } from './blocks.service';
import { UpsertBlocksDto } from './dto/upsert-blocks.dto';
import { BlockOperation } from './enums/block-operation';

const API_KEY = 'test';

describe('BlocksController', () => {
  let app: INestApplication;
  let blocksService: BlocksService;
  let config: ConfigService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    blocksService = app.get(BlocksService);
    config = app.get(ConfigService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /blocks', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

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
        const blocks = [];
        for (let i = 0; i < 3001; i++) {
          blocks.push({
            hash: uuid(),
            difficulty: uuid(),
            type: BlockOperation.CONNECTED,
            sequence: faker.datatype.number(),
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: uuid(),
            previous_block_hash: uuid(),
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
        const payload: UpsertBlocksDto = {
          blocks: [
            {
              hash: uuid(),
              difficulty: uuid(),
              type: BlockOperation.CONNECTED,
              sequence: faker.datatype.number(),
              timestamp: new Date(),
              transactions_count: 0,
              graffiti: uuid(),
              previous_block_hash: uuid(),
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
          main: true,
          sequence: block.sequence,
          timestamp: block.timestamp.toISOString(),
          transactions_count: block.transactions_count,
          previous_block_hash: block.previous_block_hash,
        });
      });
    });
  });

  describe('GET /blocks/head', () => {
    it('returns the heaviest block', async () => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => 0);
      const { body } = await request(app.getHttpServer())
        .get('/blocks/head')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        id: expect.any(Number),
        main: true,
      });
    });
  });

  describe('GET /blocks', () => {
    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/blocks')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
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

    describe('with a valid range', () => {
      it('returns blocks within the range', async () => {
        // Seed some blocks
        for (let i = 0; i < 10; i++) {
          await prisma.block.create({
            data: {
              hash: uuid(),
              difficulty: uuid(),
              main: true,
              sequence: i,
              timestamp: new Date(),
              transactions_count: 0,
              graffiti: uuid(),
              previous_block_hash: uuid(),
              network_version: 0,
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
          difficulty: expect.any(String),
          main: true,
          sequence: expect.any(Number),
          timestamp: expect.any(String),
          transactions_count: expect.any(Number),
          previous_block_hash: expect.any(String),
        });
      });
    });
  });

  describe('GET /blocks/find', () => {
    describe('with a valid hash', () => {
      it('returns the block with the correct hash', async () => {
        const testBlockHash = uuid();
        await prisma.block.create({
          data: {
            hash: testBlockHash,
            difficulty: uuid(),
            main: true,
            sequence: faker.datatype.number(),
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            network_version: 0,
          },
        });

        const { body } = await request(app.getHttpServer())
          .get('/blocks/find')
          .query({ hash: testBlockHash })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: expect.any(Number),
          hash: testBlockHash,
          difficulty: expect.any(String),
          main: true,
          sequence: expect.any(Number),
          timestamp: expect.any(String),
          transactions_count: expect.any(Number),
          previous_block_hash: expect.any(String),
        });
      });
    });
    describe('with a valid sequence', () => {
      it('returns the block with the correct hash', async () => {
        const testBlockSequence = faker.datatype.number();
        await prisma.block.create({
          data: {
            hash: uuid(),
            difficulty: uuid(),
            main: true,
            sequence: testBlockSequence,
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            network_version: 0,
          },
        });

        const { body } = await request(app.getHttpServer())
          .get('/blocks/find')
          .query({ sequence: testBlockSequence })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: expect.any(Number),
          hash: expect.any(String),
          difficulty: expect.any(String),
          main: true,
          sequence: testBlockSequence,
          timestamp: expect.any(String),
          transactions_count: expect.any(Number),
          previous_block_hash: expect.any(String),
        });
      });
    });
    describe('with neither a valid hash or sequence', () => {
      it('returns a 422', async () => {
        await prisma.block.create({
          data: {
            hash: uuid(),
            difficulty: uuid(),
            main: true,
            sequence: faker.datatype.number(),
            timestamp: new Date(),
            transactions_count: 0,
            graffiti: uuid(),
            previous_block_hash: uuid(),
            network_version: 0,
          },
        });

        const { body } = await request(app.getHttpServer())
          .get('/blocks/find')
          .query({ hash: undefined, sequence: undefined })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });
  });

  describe('POST /blocks/disconnect', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

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
});
