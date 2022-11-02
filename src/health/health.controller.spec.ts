/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiConfigService } from '../api-config/api-config.service';
import { bootstrapTestApp } from '../test/test-app';

describe('HealthController', () => {
  let app: INestApplication;
  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    const config = app.get(ApiConfigService);
    API_KEY = config.get<string>('IRONFISH_API_KEY');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns a 200 status code', async () => {
      await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);
    });
  });

  describe('GET /health/admin', () => {
    it('returns a 200 status code', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/health/admin')
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        queued_jobs: expect.any(Number),
      });
    });
  });

  describe('GET /health/deposit', () => {
    it('returns a 200 status code', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/health/deposit')
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        mismatched_deposits: expect.any(Number),
      });
    });
  });
});
