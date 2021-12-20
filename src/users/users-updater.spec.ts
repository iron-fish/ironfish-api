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
import { UsersUpdater } from './users-updater';

describe('UsersUpdater', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let usersUpdater: UsersUpdater;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
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
    const user = await prisma.user.create({
      data: {
        confirmation_token: ulid(),
        confirmed_at: new Date().toISOString(),
        discord: faker.internet.userName(),
        email: faker.internet.email(),
        graffiti,
        country_code: faker.address.countryCode('alpha-3'),
        telegram: faker.internet.userName(),
        total_points: points ?? POINTS_PER_CATEGORY.BLOCK_MINED,
      },
    });
    return { block, user };
  };

  describe('update', () => {
    describe("when the user's current graffiti has already mined blocks on the main chain", () => {
      it('throws an UnprocessableEntityException', async () => {
        const { user } = await setupBlockMined();
        await expect(
          usersUpdater.update(user, { graffiti: 'foo' }),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('when a user exists for the new discord', () => {
      it('throws an UnprocessableEntityException', async () => {
        const { user: existingUser } = await setupBlockMined();
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: ulid(),
            country_code: faker.address.countryCode('alpha-3'),
            total_points: 0,
          },
        });

        assert.ok(existingUser.discord);
        await expect(
          usersUpdater.update(user, { discord: existingUser.discord }),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('when a user exists for the new graffiti without blocks mined', () => {
      it('throws an UnprocessableEntityException', async () => {
        const existingUser = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            discord: faker.internet.userName(),
            email: faker.internet.email(),
            graffiti: ulid(),
            country_code: faker.address.countryCode('alpha-3'),
            telegram: faker.internet.userName(),
            total_points: 0,
          },
        });
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: ulid(),
            country_code: faker.address.countryCode('alpha-3'),
            total_points: 0,
          },
        });

        await expect(
          usersUpdater.update(user, { graffiti: existingUser.graffiti }),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('when a user exists for the new telegram', () => {
      it('throws an UnprocessableEntityException', async () => {
        const { user: existingUser } = await setupBlockMined();
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: ulid(),
            country_code: faker.address.countryCode('alpha-3'),
            total_points: 0,
          },
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
          graffiti: ulid(),
          telegram: ulid(),
        };
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: ulid(),
            country_code: faker.address.countryCode('alpha-3'),
            total_points: 0,
          },
        });

        const updatedUser = await usersUpdater.update(user, options);
        expect(updatedUser).toMatchObject({
          id: user.id,
          discord: options.discord,
          graffiti: options.graffiti,
          telegram: options.telegram,
        });
      });
    });
  });
});
