/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from './users.service';
import { EventType } from '.prisma/client';

describe('UsersService', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    usersService = app.get(UsersService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('findOrThrow', () => {
    describe('with a valid id', () => {
      it('returns the record', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const record = await usersService.findOrThrow(user.id);
        expect(record).not.toBeNull();
        expect(record).toMatchObject(user);
      });
    });

    describe('with a missing id', () => {
      it('returns null', async () => {
        await expect(usersService.findOrThrow(1337)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('findByGraffiti', () => {
    describe('with a valid graffiti', () => {
      it('returns the record', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
            last_login_at: new Date(),
          },
        });
        const record = await usersService.findByGraffiti(user.graffiti);
        expect(record).not.toBeNull();
        expect(record).toMatchObject(user);
      });
    });

    describe('with a user not logged in yet', () => {
      it('returns null', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const record = await usersService.findByGraffiti(user.graffiti);
        expect(record).toBeNull();
      });
    });

    describe('with a missing id', () => {
      it('returns null', async () => {
        expect(await usersService.findByGraffiti('1337')).toBeNull();
      });
    });
  });

  describe('findOrThrowByGraffiti', () => {
    describe('with a valid graffiti', () => {
      it('returns the record', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
            last_login_at: new Date(),
          },
        });
        const record = await usersService.findOrThrowByGraffiti(user.graffiti);
        expect(record).not.toBeNull();
        expect(record).toMatchObject(user);
      });
    });

    describe('with a missing id', () => {
      it('throws an exception', async () => {
        await expect(
          usersService.findOrThrowByGraffiti('1337'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('list', () => {
    it('returns a chunk of users', async () => {
      const limit = 2;
      const records = await usersService.list({
        limit,
      });
      expect(records).toHaveLength(limit);
      for (const record of records) {
        expect(record).toMatchObject({
          id: expect.any(Number),
          email: expect.any(String),
          graffiti: expect.any(String),
        });
      }
    });

    describe('if an order by points is provided', () => {
      it('sorts the users by points', async () => {
        const records = await usersService.list({
          orderBy: 'total_points',
        });

        for (let i = 1; i < records.length; i++) {
          const previousRecord = records[i - 1];
          const record = records[i];
          expect(previousRecord.total_points).toBeGreaterThanOrEqual(
            record.total_points,
          );
        }
      });
    });
  });

  describe('create', () => {
    describe('with a duplicate graffiti', () => {
      describe('with a previously activated user', () => {
        it('throws an exception', async () => {
          const graffiti = uuid();
          await prisma.user.create({
            data: {
              email: faker.internet.email(),
              graffiti,
              country_code: faker.address.countryCode('alpha-3'),
              last_login_at: new Date(),
            },
          });

          await expect(
            usersService.create({
              email: faker.internet.email(),
              graffiti,
              country_code: faker.address.countryCode('alpha-3'),
            }),
          ).rejects.toThrow(UnprocessableEntityException);
        });
      });

      describe('with a user that has not been activated', () => {
        it('creates a record', async () => {
          const graffiti = uuid();
          await prisma.user.create({
            data: {
              email: faker.internet.email(),
              graffiti,
              country_code: faker.address.countryCode('alpha-3'),
            },
          });

          const email = faker.internet.email();
          const user = await usersService.create({
            email,
            graffiti,
            country_code: faker.address.countryCode('alpha-3'),
          });

          expect(user).toMatchObject({
            id: expect.any(Number),
            email,
            graffiti,
          });
        });
      });
    });

    describe('with a duplicate email', () => {
      describe('with a previously activated user', () => {
        it('throws an exception', async () => {
          const email = faker.internet.email();
          await prisma.user.create({
            data: {
              email,
              graffiti: uuid(),
              country_code: faker.address.countryCode('alpha-3'),
              last_login_at: new Date(),
            },
          });

          await expect(
            usersService.create({
              email,
              graffiti: uuid(),
              country_code: faker.address.countryCode('alpha-3'),
            }),
          ).rejects.toThrow(UnprocessableEntityException);
        });
      });

      describe('with a user that has not been activated', () => {
        it('creates a record', async () => {
          const email = faker.internet.email();
          await prisma.user.create({
            data: {
              email,
              graffiti: uuid(),
              country_code: faker.address.countryCode('alpha-3'),
            },
          });

          const graffiti = uuid();
          const user = await usersService.create({
            email,
            graffiti,
            country_code: faker.address.countryCode('alpha-3'),
          });

          expect(user).toMatchObject({
            id: expect.any(Number),
            email,
            graffiti,
          });
        });
      });
    });

    describe('with a new graffiti and email', () => {
      it('creates a new record', async () => {
        const email = faker.internet.email();
        const graffiti = uuid();
        const user = await usersService.create({
          email,
          graffiti,
          country_code: faker.address.countryCode('alpha-3'),
        });

        expect(user).toMatchObject({
          id: expect.any(Number),
          email,
          graffiti,
        });
      });
    });
  });

  describe('updateLastLoginAtByEmail', () => {
    describe('with a missing email', () => {
      it('throws a NotFoundException', async () => [
        await expect(
          usersService.updateLastLoginAtByEmail('foo@ironfish.network'),
        ).rejects.toThrow(NotFoundException),
      ]);
    });

    describe('with a valid email', () => {
      it('updates the last login timestamp', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        const updatedUser = await usersService.updateLastLoginAtByEmail(
          user.email,
        );
        expect(updatedUser).toMatchObject({
          id: user.id,
          last_login_at: expect.any(Date),
        });
        expect(updatedUser.last_login_at).not.toEqual(user.last_login_at);
      });
    });
  });

  describe('getRank', () => {
    it('returns the correct rank', async () => {
      const aggregate = await prisma.user.aggregate({
        _max: {
          total_points: true,
        },
      });
      const currentMaxPoints = aggregate._max.total_points || 0;
      const totalPoints = currentMaxPoints + 2;
      const firstUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
          total_points: totalPoints,
        },
      });
      const secondUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
          total_points: totalPoints,
        },
      });
      const thirdUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
          total_points: totalPoints - 1,
        },
      });
      const firstEvent = await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: firstUser.id,
          occurred_at: new Date(),
          points: 0,
        },
      });
      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: secondUser.id,
          occurred_at: new Date(firstEvent.occurred_at.valueOf() - 1000),
          points: 0,
        },
      });

      expect(await usersService.getRank(secondUser)).toBe(1);
      expect(await usersService.getRank(firstUser)).toBe(2);
      expect(await usersService.getRank(thirdUser)).toBe(3);
    });
  });
});
