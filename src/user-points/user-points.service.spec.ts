/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
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

  it('should find UserPoints', async () => {
    await expect(userPointsService.findOrThrow(0)).rejects.toThrow('Not Found');

    const user = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      countryCode: faker.address.countryCode('alpha-3'),
    });

    await userPointsService.upsert({
      userId: user.id,
    });

    const points = await userPointsService.findOrThrow(user.id);
    expect(points.user_id).toBe(user.id);
  });

  describe('upsert', () => {
    it('updates user points and timestamps with the payload', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
      });

      const points = {
        [EventType.BLOCK_MINED]: {
          points: 100,
          count: 5,
          latestOccurredAt: new Date(),
        },
        [EventType.PULL_REQUEST_MERGED]: {
          points: 110,
          count: 5,
          latestOccurredAt: new Date(),
        },
        [EventType.NODE_UPTIME]: {
          points: 150,
          count: 5,
          latestOccurredAt: new Date(),
        },
        [EventType.SEND_TRANSACTION]: {
          points: 120,
          count: 5,
          latestOccurredAt: new Date(),
        },
      };
      const totalPoints = Object.values(points).reduce((sum, { points }) => {
        return sum + points;
      }, 0);

      const options: UpsertUserPointsOptions = {
        userId: user.id,
        points: points,
        totalPoints,
      };

      const record = await userPointsService.upsert(options);

      expect(record).toMatchObject({
        user_id: user.id,
        total_points: totalPoints,
        block_mined_points: points.BLOCK_MINED.points,
        block_mined_last_occurred_at: points.BLOCK_MINED.latestOccurredAt,
        pull_request_merged_points: points.PULL_REQUEST_MERGED.points,
        pull_request_merged_last_occurred_at:
          points.PULL_REQUEST_MERGED.latestOccurredAt,
        node_uptime_points: points.NODE_UPTIME.points,
        node_uptime_last_occurred_at: points.NODE_UPTIME.latestOccurredAt,
        send_transaction_points: points.SEND_TRANSACTION.points,
        send_transaction_last_occurred_at:
          points.SEND_TRANSACTION.latestOccurredAt,
      });
    });
  });
});
