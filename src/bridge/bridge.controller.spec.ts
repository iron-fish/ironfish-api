/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { BridgeRequestStatus, BridgeRequestType } from '@prisma/client';
import assert from 'assert';
import request from 'supertest';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { BridgeDataDTO } from './dto';

describe('AssetsController', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let config: ApiConfigService;
  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
    config = app.get(ApiConfigService);

    API_KEY = config.get<string>('IRONFISH_API_KEY');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.bridgeRequest.deleteMany({});
  });

  describe('POST /bridge/create', () => {
    describe('when data is posted to endpoint', () => {
      it('is successful creates record and returns fk', async () => {
        const address = '11111111111111111111111111';
        const data: BridgeDataDTO = {
          address,
          asset:
            '51f33a2f14f92735e562dc658a5639279ddca3d5079a6d1242b2a588a9cbf44c',
          transaction:
            '00000000000000021a63de16fea25d79f66f092862a893274690000000000000',
          status: 'PENDING',
          type: BridgeRequestType.IRONFISH_TO_ETH,
        };
        const { body } = await request(app.getHttpServer())
          .post('/bridge/create')
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ requests: [data] })
          .expect(HttpStatus.CREATED);

        const entry = await prisma.bridgeRequest.findFirst({
          where: { address: { equals: address } },
        });
        assert.ok(entry);

        expect(body).toMatchObject({
          [address]: entry.id,
        });
      });
    });
  });

  describe('POST /bridge/retrieve', () => {
    describe('when data is requested by id', () => {
      it('is successfully returns if fk is in db, null if not', async () => {
        const unsavedId = 1234567;
        const address =
          '2222222222222222222222222222222222222222222222222222222222222222222222222222222222222';
        const status = BridgeRequestStatus.PENDING;
        const type = BridgeRequestType.ETH_TO_IRONFISH;
        const transaction =
          '00000000000000021a63de16fea25d79f66f092862a8932746903e01ecbd6820';
        const asset =
          '51f33a2f14f92735e562dc658a5639279ddca3d5079a6d1242b2a588a9cbf44c';
        const foo = await prisma.bridgeRequest.create({
          data: {
            address,
            type,
            status,
            asset,
            transaction,
          },
        });
        const { body } = await request(app.getHttpServer())
          .get('/bridge/retrieve')
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ ids: [foo.id, unsavedId] })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          [foo.id]: {
            address,
            type,
            status,
            asset,
            transaction,
          },
          [unsavedId]: null,
        });
      });
    });
  });

  describe('POST /bridge/head', () => {
    describe('updates or creates head for tracking sync progress', () => {
      it('creates then updates head', async () => {
        await request(app.getHttpServer())
          .post('/bridge/head')
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ head: 'fakehash1' })
          .expect(HttpStatus.CREATED);

        const { body } = await request(app.getHttpServer())
          .post('/bridge/head')
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ head: 'fakehash2' })
          .expect(HttpStatus.CREATED);

        expect(body).toEqual({
          hash: 'fakehash2',
        });

        const count = await prisma.bridgeHead.count();
        expect(count).toBe(1);

        const { body: getBody } = await request(app.getHttpServer())
          .get('/bridge/head')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.OK);

        expect(getBody.hash).toBe('fakehash2');
      });
    });
  });
});
