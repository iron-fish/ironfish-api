/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';

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
    await prisma.ethBridgeAddresses.deleteMany({});
  });

  describe('POST /bridge/create', () => {
    describe('creates entries that are not present and retrieves those that are', () => {
      it('returns a 404', async () => {
        const foo = await prisma.ethBridgeAddresses.create({
          data: { address: 'foo' },
        });
        const { body } = await request(app.getHttpServer())
          .post('/bridge/create')
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ addresses: ['foo', 'bar', 'baz'] })
          .expect(HttpStatus.CREATED);

        expect(body).toMatchObject({
          foo: foo.id,
          bar: expect.any(Number),
          baz: expect.any(Number),
        });
        const count = await prisma.ethBridgeAddresses.count();
        expect(count).toBe(3);
      });
    });
  });
  describe('POST /bridge/retrieve', () => {
    describe('retrieves ids for entries that are present, null for absent', () => {
      it('returns a 404', async () => {
        const unsavedId = 1234567;
        const foo = await prisma.ethBridgeAddresses.create({
          data: { address: 'foo' },
        });
        const bar = await prisma.ethBridgeAddresses.create({
          data: { address: 'bar' },
        });
        const { body } = await request(app.getHttpServer())
          .get('/bridge/retrieve')
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ ids: [foo.id, bar.id, unsavedId] })
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          [foo.id]: foo.address,
          [bar.id]: bar.address,
          [unsavedId]: null,
        });
      });
    });
  });
});
