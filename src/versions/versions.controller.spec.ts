/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiConfigService } from '../api-config/api-config.service';
import { bootstrapTestApp } from '../test/test-app';
import { VersionsService } from './versions.service';

describe('VersionsController', () => {
  let app: INestApplication;
  let versionsService: VersionsService;
  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    versionsService = app.get(VersionsService);
    API_KEY = app.get(ApiConfigService).get<string>('IRONFISH_API_KEY');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /version', () => {
    it('returns a 200 status code', async () => {
      await request(app.getHttpServer()).get('/version').expect(HttpStatus.OK);
    });

    it('returns the correct version', async () => {
      await versionsService.create('0.1.20');
      const { text } = await request(app.getHttpServer()).get('/version');
      expect(text).toBe('0.1.20');
    });
  });

  describe('POST /version', () => {
    describe('with a missing api key', () => {
      it('returns a 401 status code', async () => {
        await request(app.getHttpServer())
          .post('/version')
          .expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('with a missing version query param', () => {
      it('returns a 422 status code', async () => {
        await request(app.getHttpServer())
          .post('/version')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);
      });
    });

    describe('with an incorrectly formatted version query param', () => {
      it('returns a 422 status code', async () => {
        await request(app.getHttpServer())
          .post('/version')
          .query({ version: '123' })
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);
      });
    });

    describe('with a valid version query param', () => {
      it('returns a 201 status code and created version', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/version')
          .query({ version: '0.12.345' })
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.CREATED);
        expect(body).toMatchObject({
          id: expect.any(Number),
          created_at: expect.any(String),
          version: '0.12.345',
        });
      });
    });
  });
});
