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
import { UpsertTransactionsDto } from './dto/upsert-transactions.dto';

const API_KEY = 'test';

describe('TransactionsController', () => {
  let app: INestApplication;
  let config: ConfigService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ConfigService);
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

  describe('POST /transactions', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

    describe('with a missing API key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/transactions`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/transactions`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ transactions: [{}] })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with too many transactions', () => {
      it('returns a 422', async () => {
        const transactions = [];
        const { block } = await setupBlockMined();
        for (let i = 0; i < 3001; i++) {
          transactions.push({
            hash: uuid(),
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            timestamp: new Date(),
            block_id: block.id,
            notes: faker.datatype.json(),
            spends: faker.datatype.json(),
          });
        }

        const payload: UpsertTransactionsDto = { transactions };

        const { body } = await request(app.getHttpServer())
          .post(`/transactions`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send(payload)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid payload', () => {
      it('upserts transactions', async () => {
        const { block } = await setupBlockMined();
        const payload: UpsertTransactionsDto = {
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
        };

        const transaction = payload.transactions[0];
        const { body } = await request(app.getHttpServer())
          .post(`/transactions`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send(payload)
          .expect(HttpStatus.CREATED);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          hash: transaction.hash,
          fee: transaction.fee.toString(),
          size: transaction.size,
          timestamp: transaction.timestamp.toISOString(),
          block_id: transaction.block_id,
          notes: transaction.notes,
          spends: transaction.spends,
        });
      });
    });
  });

  describe('GET /transactions/find', () => {
    describe('with a valid hash', () => {
      it('returns the transaction with the correct hash', async () => {
        const testTransactionHash = uuid();
        const { block } = await setupBlockMined();
        await prisma.transaction.create({
          data: {
            hash: testTransactionHash,
            network_version: 0,
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            timestamp: new Date(),
            block_id: block.id,
            notes: faker.datatype.json(),
            spends: faker.datatype.json(),
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
          timestamp: expect.any(String),
          block_id: block.id,
          notes: expect.any(String),
          spends: expect.any(String),
        });
      });
    });

    describe('with an invalid hash', () => {
      it('returns a 404', async () => {
        const { block } = await setupBlockMined();
        await prisma.transaction.create({
          data: {
            hash: uuid(),
            network_version: 0,
            fee: faker.datatype.number(),
            size: faker.datatype.number(),
            timestamp: new Date(),
            block_id: block.id,
            notes: faker.datatype.json(),
            spends: faker.datatype.json(),
          },
        });

        const { body } = await request(app.getHttpServer())
          .get('/transactions/find')
          .query({ hash: uuid() })
          .expect(HttpStatus.NOT_FOUND);

        expect(body).toMatchSnapshot();
      });
    });
  });
});
