/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { ulid } from 'ulid';
import { v4 as uuid } from 'uuid';
import { standardizeEmail } from '../common/utils/email';
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

  describe('find', () => {
    describe('with a valid id', () => {
      it('returns the record', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const record = await usersService.find(user.id);
        expect(record).not.toBeNull();
        expect(record).toMatchObject(user);
      });
    });

    describe('with a missing id', () => {
      it('returns null', async () => {
        expect(await usersService.find(100000)).toBeNull();
      });
    });
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
      it('throws a NotFoundException', async () => {
        await expect(usersService.findOrThrow(100000)).rejects.toThrow(
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
          },
        });
        const record = await usersService.findByGraffiti(user.graffiti);
        expect(record).not.toBeNull();
        expect(record).toMatchObject(user);
      });
    });

    describe('with a missing graffiti', () => {
      it('returns null', async () => {
        expect(await usersService.findByGraffiti('1337')).toBeNull();
      });
    });
  });

  describe('findByGraffitiOrThrow', () => {
    describe('with a valid graffiti', () => {
      it('returns the record', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const record = await usersService.findByGraffitiOrThrow(user.graffiti);
        expect(record).not.toBeNull();
        expect(record).toMatchObject(user);
      });
    });

    describe('with a missing graffiti', () => {
      it('throws an exception', async () => {
        await expect(
          usersService.findByGraffitiOrThrow('1337'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('findByEmailOrThrow', () => {
    describe('with a missing email', () => {
      it('throws an exception', async () => {
        await expect(
          usersService.findByEmailOrThrow('howdy@partner.com'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('with a valid email', () => {
      it('returns the confirmed record', async () => {
        const email = faker.internet.email();
        const user = await prisma.user.create({
          data: {
            email,
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });

        const record = await usersService.findByEmailOrThrow(email);
        expect(record).toMatchObject(user);
      });
    });
  });

  describe('findByEmail', () => {
    describe('with a missing email', () => {
      it('returns null', async () => {
        expect(await usersService.findByEmail('howdy@partner.com')).toBeNull();
      });
    });

    describe('with a valid email', () => {
      it('returns the confirmed record', async () => {
        const email = faker.internet.email();
        const user = await prisma.user.create({
          data: {
            email,
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });

        const record = await usersService.findByEmail(email);
        expect(record).toMatchObject(user);
      });
    });
  });

  describe('listByEmail', () => {
    it('returns a list of matching users by email', async () => {
      const email = faker.internet.email();
      await usersService.create({
        email,
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });

      const records = await usersService.listByEmail(email);
      for (const record of records) {
        expect(record.email).toBe(standardizeEmail(email));
      }
    });
  });

  describe('list', () => {
    it('returns a chunk of users', async () => {
      const limit = 2;
      const { data: records } = await usersService.list({
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
  });

  describe('listWithRank', () => {
    it('returns a chunk of users with rank', async () => {
      const limit = 10;
      const { data: records } = await usersService.listWithRank({
        limit,
        search: '7',
      });
      expect(records.length).toBeLessThanOrEqual(limit);
      for (const record of records) {
        expect(record).toMatchObject({
          id: expect.any(Number),
          graffiti: expect.any(String),
          rank: expect.any(Number),
        });
      }
    });

    it('returns users ranked correctly', async () => {
      const graffiti = uuid();
      const now = new Date();

      const userA = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: graffiti + '-a',
          country_code: faker.address.countryCode('alpha-3'),
          total_points: 2,
        },
      });

      const userB = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: graffiti + '-b',
          country_code: faker.address.countryCode('alpha-3'),
          total_points: 2,
        },
      });

      const userC = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: graffiti + '-c',
          country_code: faker.address.countryCode('alpha-3'),
          total_points: 1,
        },
      });

      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: userA.id,
          occurred_at: now,
          points: 1,
        },
      });

      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: userB.id,
          occurred_at: new Date(now.valueOf() - 1000),
          points: 1,
        },
      });

      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: userB.id,
          occurred_at: new Date(now.valueOf() + 1000),
          points: 0,
        },
      });

      const { data: records } = await usersService.listWithRank({
        eventType: 'BUG_CAUGHT',
        search: graffiti,
        limit: 3,
      });

      // Because userB caught a bug first, we consider userB to be
      // ranked earlier than userA. The last event for userB doesn't
      // count because it has 0 points.
      expect(records[0].graffiti).toEqual(userB.graffiti);
      expect(records[1].graffiti).toEqual(userA.graffiti);
      expect(records[2].graffiti).toEqual(userC.graffiti);
      expect(records[0].rank).toBeLessThan(records[1].rank);
      expect(records[1].rank).toBeLessThan(records[2].rank);
    });

    describe(`when 'event_type' is provided`, () => {
      it('returns a chunk of users by event when specified', async () => {
        const { data: records } = await usersService.listWithRank({
          eventType: 'BUG_CAUGHT',
        });
        records.map((record) =>
          expect(record).toMatchObject({
            id: expect.any(Number),
            graffiti: expect.any(String),
            rank: expect.any(Number),
          }),
        );
      });
    });
  });

  describe('create', () => {
    describe('with a duplicate graffiti', () => {
      it('throws an exception', async () => {
        const graffiti = uuid();
        await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti,
            country_code: faker.address.countryCode('alpha-3'),
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

    describe('with a duplicate email', () => {
      it('throws an exception', async () => {
        const email = faker.internet.email();
        await prisma.user.create({
          data: {
            email: standardizeEmail(email),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
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

    describe('with a duplicate github', () => {
      it('throws an exception', async () => {
        const github = faker.internet.userName();
        await prisma.user.create({
          data: {
            email: faker.internet.email(),
            github,
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });

        await expect(
          usersService.create({
            email: faker.internet.email(),
            graffiti: uuid(),
            github,
            country_code: faker.address.countryCode('alpha-3'),
          }),
        ).rejects.toThrow(UnprocessableEntityException);
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
          email: standardizeEmail(email),
          graffiti,
        });
      });
    });
  });

  describe('updateLastLoginAtByEmail', () => {
    it('updates the last login timestamp', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      const updatedUser = await usersService.updateLastLoginAt(user);
      expect(updatedUser).toMatchObject({
        id: user.id,
        last_login_at: expect.any(Date),
      });
      expect(updatedUser.last_login_at).not.toEqual(user.last_login_at);
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

      const firstUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
          total_points: currentMaxPoints + 2,
        },
      });

      const secondUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
          total_points: currentMaxPoints + 2,
        },
      });

      const thirdUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
          total_points: currentMaxPoints + 1,
        },
      });

      const now = new Date();

      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: firstUser.id,
          occurred_at: now,
          points: 1,
        },
      });

      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: secondUser.id,
          occurred_at: new Date(now.valueOf() - 1000),
          points: 1,
        },
      });

      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: secondUser.id,
          occurred_at: new Date(now.valueOf() + 1000),
          points: 0,
        },
      });

      // Because secondUser caught a bug first, we consider secondUser to be
      // ranked earlier than firstUser. The last event for secondUser doesn't
      // count because it has 0 points.
      expect(await usersService.getRank(secondUser)).toBe(1);
      expect(await usersService.getRank(firstUser)).toBe(2);
      expect(await usersService.getRank(thirdUser)).toBe(3);
    });
  });

  describe('findDuplicateUser', () => {
    describe('with a duplicate discord', () => {
      it('returns the duplicate records', async () => {
        const user = await usersService.create({
          country_code: faker.address.countryCode('alpha-3'),
          discord: ulid(),
          email: faker.internet.email(),
          graffiti: uuid(),
        });
        const duplicateUser = await usersService.create({
          country_code: faker.address.countryCode('alpha-3'),
          discord: ulid(),
          email: faker.internet.email(),
          graffiti: uuid(),
        });

        assert.ok(duplicateUser.discord);
        const duplicateUsers = await usersService.findDuplicateUser(
          user,
          { discord: duplicateUser.discord },
          prisma,
        );
        expect(duplicateUsers).toHaveLength(1);
        assert.ok(duplicateUsers[0]);
        expect(duplicateUsers[0].id).toBe(duplicateUser.id);
      });
    });

    describe('with a duplicate graffiti', () => {
      it('returns the duplicate records', async () => {
        const user = await usersService.create({
          country_code: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
        });
        const duplicateUser = await usersService.create({
          country_code: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
        });

        const duplicateUsers = await usersService.findDuplicateUser(
          user,
          { graffiti: duplicateUser.graffiti },
          prisma,
        );
        expect(duplicateUsers).toHaveLength(1);
        assert.ok(duplicateUsers[0]);
        expect(duplicateUsers[0].id).toBe(duplicateUser.id);
      });
    });

    describe('with a duplicate telegram', () => {
      it('returns the duplicate records', async () => {
        const user = await usersService.create({
          country_code: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
          telegram: ulid(),
        });
        const duplicateUser = await usersService.create({
          country_code: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
          telegram: ulid(),
        });

        assert.ok(duplicateUser.telegram);
        const duplicateUsers = await usersService.findDuplicateUser(
          user,
          { telegram: duplicateUser.telegram },
          prisma,
        );
        expect(duplicateUsers).toHaveLength(1);
        assert.ok(duplicateUsers[0]);
        expect(duplicateUsers[0].id).toBe(duplicateUser.id);
      });
    });

    describe('with empty strings', () => {
      it('ignores the empty filters and returns the duplicate records', async () => {
        const user = await usersService.create({
          country_code: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
          telegram: ulid(),
        });
        const duplicateUser = await usersService.create({
          country_code: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
          telegram: ulid(),
        });

        assert.ok(duplicateUser.telegram);
        const duplicateUsers = await usersService.findDuplicateUser(
          user,
          { telegram: duplicateUser.telegram, discord: '' },
          prisma,
        );
        expect(duplicateUsers).toHaveLength(1);
        assert.ok(duplicateUsers[0]);
        expect(duplicateUsers[0].id).toBe(duplicateUser.id);
      });
    });
  });

  describe('update', () => {
    it('updates the record', async () => {
      const options = {
        countryCode: faker.address.countryCode('alpha-3'),
        discord: ulid(),
        graffiti: ulid(),
        telegram: ulid(),
      };
      const user = await usersService.create({
        country_code: faker.address.countryCode('alpha-3'),
        email: faker.internet.email(),
        graffiti: uuid(),
        telegram: ulid(),
      });

      const updatedUser = await usersService.update(user, options, prisma);
      expect(updatedUser).toMatchObject({
        id: user.id,
        country_code: options.countryCode,
        discord: options.discord,
        graffiti: options.graffiti,
        telegram: options.telegram,
      });
    });
  });
});
