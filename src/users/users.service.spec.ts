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

describe('UsersService', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
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
        discord: ulid(),
        github: ulid(),
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
        discord: options.discord,
        github: options.github,
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
