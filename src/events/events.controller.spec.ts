/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiConfigService } from '../api-config/api-config.service';
import { bootstrapTestApp } from '../test/test-app';

const API_KEY = 'test';

describe('EventsController', () => {
  let app: INestApplication;
  let config: ApiConfigService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('DELETE /events', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .delete(`/events/123`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing event id', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .delete(`/events/12345`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });
  });
});
