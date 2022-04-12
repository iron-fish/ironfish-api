/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { UpsertUserPointsOptions } from './interfaces/upsert-user-points-options';
import { UserPointsService } from './user-points.service';
import { EventType } from '.prisma/client';

describe('UserPointsService', () => {
  let app: INestApplication;
  let userPointsService: UserPointsService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    userPointsService = app.get(UserPointsService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('upsert', () => {
    it('updates user points and timestamps with the payload', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      const blockMinedPoints = 100;
      const pullRequestPoints = 100;
      const totalPoints = 200;
      const options: UpsertUserPointsOptions = {
        userId: user.id,
        points: {
          [EventType.BLOCK_MINED]: {
            points: blockMinedPoints,
            latestOccurredAt: new Date(),
          },
          [EventType.PULL_REQUEST_MERGED]: {
            points: pullRequestPoints,
            latestOccurredAt: new Date(),
          },
        },
        totalPoints,
      };

      const record = await userPointsService.upsert(options);

      assert.ok(options.points);
      assert.ok(options.points.BLOCK_MINED);
      assert.ok(options.points.PULL_REQUEST_MERGED);
      expect(record).toMatchObject({
        user_id: user.id,
        total_points: totalPoints,
        block_mined_points: blockMinedPoints,
        block_mined_last_occurred_at:
          options.points.BLOCK_MINED.latestOccurredAt,
        pull_request_merged_points: pullRequestPoints,
        pull_request_merged_last_occurred_at:
          options.points.PULL_REQUEST_MERGED.latestOccurredAt,
      });
    });
  });
});
