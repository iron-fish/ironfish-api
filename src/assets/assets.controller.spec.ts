/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetsService } from './assets.service';

describe('AssetsController', () => {
  let app: INestApplication;
  let assetsService: AssetsService;
  let prisma: PrismaService;
  let transactionsService: TransactionsService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    assetsService = app.get(AssetsService);
    prisma = app.get(PrismaService);
    transactionsService = app.get(TransactionsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /assets/find', () => {
    describe('with an invalid query', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/assets/find')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing record', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .get('/assets/find')
          .query({ id: 'asdf' })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid identifier', () => {
      it('returns the asset', async () => {
        const transaction = (
          await transactionsService.createMany([
            {
              fee: 0,
              hash: uuid(),
              notes: [],
              size: 0,
              spends: [],
            },
          ])
        )[0];

        const asset = await assetsService.upsert(
          {
            identifier: uuid(),
            metadata: uuid(),
            name: uuid(),
            owner: uuid(),
          },
          transaction,
          prisma,
        );

        const { body } = await request(app.getHttpServer())
          .get('/assets/find')
          .query({ id: asset.identifier })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          created_transaction_hash: transaction.hash,
          identifier: asset.identifier,
          metadata: asset.metadata,
          name: asset.name,
          owner: asset.owner,
          supply: asset.supply.toString(),
        });
      });
    });
  });
});
