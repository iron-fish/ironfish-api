/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, UnprocessableEntityException } from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { ulid } from 'ulid';
import { v4 as uuid } from 'uuid';
import { POINTS_PER_CATEGORY } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UserPointsService } from '../user-points/user-points.service';
import { UsersService } from './users.service';
import { UsersUpdater } from './users-updater';

describe('UsersUpdater', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userPointsService: UserPointsService;
  let usersService: UsersService;
  let usersUpdater: UsersUpdater;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
    userPointsService = app.get(UserPointsService);
    usersService = app.get(UsersService);
    usersUpdater = app.get(UsersUpdater);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const setupBlockMined = async (points?: number) => {
    const hash = uuid();
    const sequence = faker.datatype.number();
    const graffiti = uuid();

    const block = await prisma.block.create({
      data: {
        hash,
        main: true,
        sequence,
        timestamp: new Date(),
        transactions_count: 0,
        graffiti,
        previous_block_hash: uuid(),
        network_version: 0,
        size: faker.datatype.number(),
        difficulty: faker.datatype.number(),
      },
    });
    const user = await usersService.create({
      discord: faker.internet.userName(),
      email: faker.internet.email(),
      graffiti,
      countryCode: faker.address.countryCode('alpha-3'),
      telegram: faker.internet.userName(),
    });
    await userPointsService.upsert({
      userId: user.id,
      totalPoints: points ?? POINTS_PER_CATEGORY.BLOCK_MINED,
    });
    return { block, user };
  };

  describe('update', () => {
    describe('when a user exists for the new discord', () => {
      it('throws an UnprocessableEntityException', async () => {
        const { user: existingUser } = await setupBlockMined();
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: ulid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        assert.ok(existingUser.discord);
        await expect(
          usersUpdater.update(user, { discord: existingUser.discord }),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('when a user exists for the new telegram', () => {
      it('throws an UnprocessableEntityException', async () => {
        const { user: existingUser } = await setupBlockMined();
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: ulid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        assert.ok(existingUser.telegram);
        await expect(
          usersUpdater.update(user, { telegram: existingUser.telegram }),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('with no duplicates or existing blocks', () => {
      it('updates the user', async () => {
        const options = {
          discord: ulid(),
          telegram: ulid(),
        };
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: ulid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const updatedUser = await usersUpdater.update(user, options);
        expect(updatedUser).toMatchObject({
          id: user.id,
          discord: options.discord,
          telegram: options.telegram,
        });
      });
    });
  });
});
