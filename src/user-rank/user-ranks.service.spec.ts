/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UserRanksService } from './user-ranks.service';

describe('UserRanksService', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userRankService: UserRanksService;
  let user: User;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
    userRankService = app.get(UserRanksService);
    user = await prisma.user.create({
      data: {
        email: 'test@ironfish.network',
        graffiti: 'test2134532145',
        country_code: 'US',
      },
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('refresh materialized views', () => {
    it('refreshs points when no data is present has passed', async () => {
      await prisma.userPoints.create({
        data: {
          user_id: user.id,
          pool4_count: 1,
          pool4_points: 100,
        },
      });
      await userRankService.updateRanks();
      const ranks = await prisma.$queryRawUnsafe<Record<string, unknown>>(
        'SELECT * FROM pool4_user_ranks',
      );
      expect(ranks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: user.id,
            total_points: 100,
            total_counts: 1,
          }),
        ]),
      );
    });
  });
});
