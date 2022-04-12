/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiConfigService } from '../api-config/api-config.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { bootstrapTestApp } from '../test/test-app';

describe('UserPointsController', () => {
  let app: INestApplication;
  let graphileWorkerService: GraphileWorkerService;

  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    graphileWorkerService = app.get(GraphileWorkerService);
    API_KEY = app.get(ApiConfigService).get<string>('IRONFISH_API_KEY');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /user_points/refresh', () => {
    describe('with a missing api key', () => {
      it('returns a 401 status code', async () => {
        await request(app.getHttpServer())
          .post('/user_points/refresh')
          .expect(HttpStatus.UNAUTHORIZED);
      });
    });

    it('enqueues a job to refresh users points', async () => {
      const addJob = jest
        .spyOn(graphileWorkerService, 'addJob')
        .mockImplementationOnce(jest.fn());

      await request(app.getHttpServer())
        .post('/user_points/refresh')
        .set('Authorization', `Bearer ${API_KEY}`)
        .expect(HttpStatus.CREATED);

      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.REFRESH_USERS_POINTS,
      );
    });
  });
});
