/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';

describe('EventsController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /deposits/head', () => {
    it('returns the latest deposit', async () => {
      const API_KEY = config.get<string>('IRONFISH_API_KEY');
      const NETWORK_VERSION = config.get<number>('NETWORK_VERSION');

      let response = await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const latest: number = response.body?.deposit?.block_sequence ?? 0;

      // Create a deposit that should not be picked up
      const deposit = await prisma.deposit.create({
        data: {
          transaction_hash: 'foo',
          block_hash: 'bar',
          block_sequence: latest + 1,
          note_index: 0,
          network_version: NETWORK_VERSION - 1,
          main: false,
          amount: 13,
        },
      });

      response = await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.deposit).toBeNull();

      // The deposit should be picked up now as the latest deposit
      await prisma.deposit.update({
        data: { main: true, network_version: NETWORK_VERSION },
        where: { id: deposit.id },
      });

      response = await request(app.getHttpServer())
        .get(`/deposits/head`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.deposit.id).toEqual(deposit.id);
    });
  });
});
