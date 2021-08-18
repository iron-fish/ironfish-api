/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from '../test/test-app';
import { EventType } from '.prisma/client';

describe('MetricsController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /metrics/config', () => {
    it('returns limits and points for categories', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/metrics/config`)
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        points_per_category: {
          [EventType.BLOCK_MINED]: expect.any(Number),
          [EventType.BUG_CAUGHT]: expect.any(Number),
          [EventType.COMMUNITY_CONTRIBUTION]: expect.any(Number),
          [EventType.PULL_REQUEST_MERGED]: expect.any(Number),
          [EventType.SOCIAL_MEDIA_PROMOTION]: expect.any(Number),
        },
        weekly_limits: {
          [EventType.BLOCK_MINED]: expect.any(Number),
          [EventType.BUG_CAUGHT]: expect.any(Number),
          [EventType.COMMUNITY_CONTRIBUTION]: expect.any(Number),
          [EventType.PULL_REQUEST_MERGED]: expect.any(Number),
          [EventType.SOCIAL_MEDIA_PROMOTION]: expect.any(Number),
        },
      });
    });
  });
});
