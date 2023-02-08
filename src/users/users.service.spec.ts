/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { ulid } from 'ulid';
import { v4 as uuid } from 'uuid';
import { standardizeEmail } from '../common/utils/email';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UserPointsService } from '../user-points/user-points.service';
import { UserRanksService } from '../user-rank/user-ranks.service';
import { UsersService } from './users.service';
import { EventType } from '.prisma/client';

describe('UsersService', () => {
  let app: INestApplication;
  let eventsService: EventsService;
  let usersService: UsersService;
  let prisma: PrismaService;
  let userPointsService: UserPointsService;
  let userRanksService: UserRanksService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    eventsService = app.get(EventsService);
    prisma = app.get(PrismaService);
    userPointsService = app.get(UserPointsService);
    usersService = app.get(UsersService);
    userRanksService = app.get(UserRanksService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('find', () => {
    describe('with a valid id', () => {
      it('returns the record', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
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
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
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
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
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
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
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
        const user = await usersService.create({
          email,
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
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
        const user = await usersService.create({
          email,
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
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
        countryCode: faker.address.countryCode('alpha-3'),
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
    it('returns users ranked correctly', async () => {
      const graffiti = uuid();
      const now = new Date();

      const userA = await usersService.create({
        email: faker.internet.email(),
        graffiti: graffiti + '-a',
        countryCode: faker.address.countryCode('alpha-3'),
      });

      const userB = await usersService.create({
        email: faker.internet.email(),
        graffiti: graffiti + '-b',
        countryCode: faker.address.countryCode('alpha-3'),
      });

      const userC = await usersService.create({
        email: faker.internet.email(),
        graffiti: graffiti + '-c',
        countryCode: faker.address.countryCode('alpha-3'),
      });

      await eventsService.create({
        type: EventType.SOCIAL_MEDIA_PROMOTION,
        userId: userA.id,
        occurredAt: now,
        points: 5,
      });
      await userPointsService.upsert(
        await eventsService.getUpsertPointsOptions(userA),
      );

      await eventsService.create({
        type: EventType.SOCIAL_MEDIA_PROMOTION,
        userId: userB.id,
        occurredAt: new Date(now.valueOf() - 1000),
        points: 5,
      });
      await userPointsService.upsert(
        await eventsService.getUpsertPointsOptions(userB),
      );

      await eventsService.create({
        type: EventType.SOCIAL_MEDIA_PROMOTION,
        userId: userC.id,
        occurredAt: new Date(now.valueOf() + 1000),
        points: 5,
      });
      await userPointsService.upsert(
        await eventsService.getUpsertPointsOptions(userC),
      );

      await userRanksService.updateRanks();
      const { data: records } = await userRanksService.listWithRank({
        eventType: 'SOCIAL_MEDIA_PROMOTION',
        search: graffiti,
        limit: 3,
      });

      // Because userB caught a bug first, we consider userB to be
      // ranked earlier than userA. The last event for userB doesn't
      // count because it has 0 points.
      expect(records).toHaveLength(3);

      expect(records[0].id).toEqual(userB.id);
      expect(records[1].id).toEqual(userA.id);
      expect(records[2].id).toEqual(userC.id);

      expect(records[0].total_points).toBe(5);
      expect(records[1].total_points).toBe(5);
      expect(records[2].total_points).toBe(5);

      expect(records[0].rank).toBe(1);
      expect(records[1].rank).toBe(2);
      expect(records[2].rank).toBe(3);
    });
    describe('user filtering', () => {
      let userA: User;
      let userB: User;
      const graffiti = uuid();
      const noPointsUser = graffiti + '-b';
      beforeAll(async () => {
        const now = new Date();

        userA = await usersService.create({
          email: faker.internet.email(),
          graffiti: graffiti + '-a',
          countryCode: faker.address.countryCode('alpha-3'),
        });

        userB = await usersService.create({
          email: faker.internet.email(),
          graffiti: noPointsUser,
          countryCode: faker.address.countryCode('alpha-3'),
        });

        await eventsService.create({
          type: EventType.SOCIAL_MEDIA_PROMOTION,
          userId: userA.id,
          occurredAt: now,
          points: 5,
        });
        await userPointsService.upsert(
          await eventsService.getUpsertPointsOptions(userA),
        );
      });

      it('excludes 0 point users with no search terms', async () => {
        await userRanksService.updateRanks();
        const { data: records } = await userRanksService.listWithRank({
          eventType: EventType.SOCIAL_MEDIA_PROMOTION,
        });
        const ids = records.map((user) => user.id);
        expect(ids).toContain(userA.id);
        expect(ids).not.toContain(userB.id);
      });
    });

    it('multi asset queries work as expected', async () => {
      const graffiti = uuid();
      const now = new Date();

      const userA = await usersService.create({
        email: faker.internet.email(),
        graffiti: graffiti + '-a',
        countryCode: faker.address.countryCode('alpha-3'),
      });

      await eventsService.create({
        type: EventType.MULTI_ASSET_BURN,
        userId: userA.id,
        occurredAt: now,
        points: 5,
      });

      await eventsService.create({
        type: EventType.MULTI_ASSET_MINT,
        userId: userA.id,
        occurredAt: new Date(now.valueOf() - 1000),
        points: 5,
      });

      await eventsService.create({
        type: EventType.MULTI_ASSET_BURN,
        userId: userA.id,
        occurredAt: new Date(now.valueOf() + 1000),
        points: 5,
      });

      await eventsService.create({
        type: EventType.MULTI_ASSET_TRANSFER,
        userId: userA.id,
        occurredAt: new Date(now.valueOf() + 1000),
        points: 5,
      });
      await userPointsService.upsert(
        await eventsService.getUpsertPointsOptions(userA),
      );
      await userRanksService.updateRanks();
      const { data: mintRecords } = await userRanksService.listWithRank({
        eventType: 'MULTI_ASSET_MINT',
        search: graffiti,
        limit: 1,
      });
      expect(mintRecords).toHaveLength(1);
      const { data: burnRecords } = await userRanksService.listWithRank({
        eventType: 'MULTI_ASSET_BURN',
        search: graffiti,
        limit: 1,
      });
      expect(burnRecords).toHaveLength(1);
      const { data: transferRecords } = await userRanksService.listWithRank({
        eventType: 'MULTI_ASSET_TRANSFER',
        search: graffiti,
        limit: 1,
      });
      expect(transferRecords).toHaveLength(1);
    });

    describe(`when 'event_type' is provided`, () => {
      it('returns a chunk of users by event when specified', async () => {
        const { data: records } = await userRanksService.listWithRank({
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
        await usersService.create({
          email: faker.internet.email(),
          graffiti,
          countryCode: faker.address.countryCode('alpha-3'),
        });

        await expect(
          usersService.create({
            email: faker.internet.email(),
            graffiti,
            countryCode: faker.address.countryCode('alpha-3'),
          }),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('with a duplicate email', () => {
      it('throws an exception', async () => {
        const email = faker.internet.email();
        await usersService.create({
          email: standardizeEmail(email),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        await expect(
          usersService.create({
            email,
            graffiti: uuid(),
            countryCode: faker.address.countryCode('alpha-3'),
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
          countryCode: faker.address.countryCode('alpha-3'),
        });

        expect(user).toMatchObject({
          id: expect.any(Number),
          email: standardizeEmail(email),
          graffiti,
        });
      });

      it('creates a new user points record', async () => {
        const email = faker.internet.email();
        const graffiti = uuid();
        const upsertPoints = jest.spyOn(userPointsService, 'upsertWithClient');

        const user = await usersService.create({
          email,
          graffiti,
          countryCode: faker.address.countryCode('alpha-3'),
        });

        expect(upsertPoints).toHaveBeenCalledTimes(1);
        assert.ok(upsertPoints.mock.calls);
        expect(upsertPoints.mock.calls[0][0].userId).toBe(user.id);
      });
    });
  });

  describe('updateLastLoginAtByEmail', () => {
    it('updates the last login timestamp', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
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
      const firstUser = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
      });
      const secondUser = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
      });
      const thirdUser = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
      });

      const now = new Date();
      await eventsService.create({
        type: EventType.BUG_CAUGHT,
        userId: firstUser.id,
        occurredAt: now,
        points: 1,
      });
      await eventsService.create({
        type: EventType.BUG_CAUGHT,
        userId: secondUser.id,
        occurredAt: new Date(now.valueOf() - 1000),
        points: 1,
      });
      await eventsService.create({
        type: EventType.BUG_CAUGHT,
        userId: thirdUser.id,
        occurredAt: new Date(now.valueOf() + 1000),
        points: 0,
      });
      await userPointsService.upsert(
        await eventsService.getUpsertPointsOptions(firstUser),
      );
      await userPointsService.upsert(
        await eventsService.getUpsertPointsOptions(secondUser),
      );
      await userPointsService.upsert(
        await eventsService.getUpsertPointsOptions(thirdUser),
      );

      const aggregate = await prisma.userPoints.aggregate({
        _max: {
          total_points: true,
        },
      });
      const currentMaxPoints = aggregate._max.total_points || 0;
      await userPointsService.upsert({
        userId: firstUser.id,
        totalPoints: currentMaxPoints + 2,
      });
      await userPointsService.upsert({
        userId: secondUser.id,
        totalPoints: currentMaxPoints + 2,
      });
      await userPointsService.upsert({
        userId: thirdUser.id,
        totalPoints: currentMaxPoints + 1,
      });

      // Because secondUser caught a bug first, we consider secondUser to be
      // ranked earlier than firstUser. The last event for secondUser doesn't
      // count because it has 0 points.
      await userRanksService.updateRanks();
      expect(
        await userRanksService.getRank(secondUser.id, 'total_points'),
      ).toBe(1);
      expect(await userRanksService.getRank(firstUser.id, 'total_points')).toBe(
        2,
      );
      expect(await userRanksService.getRank(thirdUser.id, 'total_points')).toBe(
        3,
      );
    });
  });

  describe('findDuplicateUser', () => {
    describe('with a duplicate discord', () => {
      it('returns the duplicate records', async () => {
        const user = await usersService.create({
          countryCode: faker.address.countryCode('alpha-3'),
          discord: ulid(),
          email: faker.internet.email(),
          graffiti: uuid(),
        });
        const duplicateUser = await usersService.create({
          countryCode: faker.address.countryCode('alpha-3'),
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

    describe('with a duplicate github', () => {
      it('returns the duplicate records', async () => {
        const user = await usersService.create({
          countryCode: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          github: faker.internet.email(),
          graffiti: uuid(),
        });
        const duplicateUser = await usersService.create({
          countryCode: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          github: faker.internet.email(),
          graffiti: uuid(),
        });

        assert.ok(duplicateUser.github);
        const duplicateUsers = await usersService.findDuplicateUser(
          user,
          { github: duplicateUser.github },
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
          countryCode: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
        });
        const duplicateUser = await usersService.create({
          countryCode: faker.address.countryCode('alpha-3'),
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
          countryCode: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
          telegram: ulid(),
        });
        const duplicateUser = await usersService.create({
          countryCode: faker.address.countryCode('alpha-3'),
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
          countryCode: faker.address.countryCode('alpha-3'),
          email: faker.internet.email(),
          graffiti: uuid(),
          telegram: ulid(),
        });
        const duplicateUser = await usersService.create({
          countryCode: faker.address.countryCode('alpha-3'),
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
        github: ulid(),
        graffiti: ulid(),
        telegram: ulid(),
      };
      const user = await usersService.create({
        countryCode: faker.address.countryCode('alpha-3'),
        email: faker.internet.email(),
        graffiti: uuid(),
        telegram: ulid(),
      });

      const updatedUser = await usersService.update(user, options, prisma);
      expect(updatedUser).toMatchObject({
        id: user.id,
        country_code: options.countryCode,
        discord: options.discord,
        github: options.github,
        graffiti: options.graffiti,
        telegram: options.telegram,
      });
    });
  });

  describe('storeHashedIpAddress', () => {
    it('stores a hashed ip address for the user', async () => {
      const user = await usersService.create({
        countryCode: faker.address.countryCode('alpha-3'),
        email: faker.internet.email(),
        graffiti: uuid(),
        telegram: ulid(),
      });

      const updatedUser = await usersService.updateHashedIpAddress(
        user,
        '127.0.0.1',
      );
      expect(updatedUser).toMatchObject({
        hashed_ip_address:
          '12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0',
      });
    });
  });
});
