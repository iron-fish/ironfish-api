/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import faker from 'faker';
import { ulid } from 'ulid';
import { v4 as uuid } from 'uuid';
import { PostmarkService } from '../postmark/postmark.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from './users.service';
import { EventType } from '.prisma/client';

describe('UsersService', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let postmarkService: PostmarkService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    usersService = app.get(UsersService);
    postmarkService = app.get(PostmarkService);
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
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
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
            confirmation_token: ulid(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
            confirmed_at: new Date(),
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
            confirmation_token: ulid(),
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

  describe('findOrThrowByEmail', () => {
    describe('with a missing email', () => {
      it('throws an exception', async () => {
        await expect(
          usersService.findOrThrowByEmail('howdy@partner.com'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('with a valid email', () => {
      it('returns the confirmed record', async () => {
        const email = faker.internet.email();
        await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            email,
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email,
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });

        const record = await usersService.findOrThrowByEmail(email);
        expect(record).toMatchObject(user);
      });
    });
  });

  describe('findOrThrowByGraffiti', () => {
    describe('with a valid graffiti', () => {
      it('returns the record', async () => {
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
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

  describe('findByConfirmationToken', () => {
    describe('with an invalid token', () => {
      it('returns null', async () => {
        expect(await usersService.findByConfirmationToken('token')).toBeNull();
      });
    });

    describe('with a valid token', () => {
      it('returns the record', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });

        const record = await usersService.findByConfirmationToken(
          user.confirmation_token,
        );
        expect(record).toMatchObject(user);
      });
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
      describe('with a previously confirmed user', () => {
        it('throws an exception', async () => {
          const graffiti = uuid();
          await prisma.user.create({
            data: {
              confirmation_token: ulid(),
              email: faker.internet.email(),
              graffiti,
              country_code: faker.address.countryCode('alpha-3'),
              confirmed_at: new Date(),
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

      describe('with a user that has not been confirmed', () => {
        it('creates a record', async () => {
          const graffiti = uuid();
          await prisma.user.create({
            data: {
              confirmation_token: ulid(),
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
      describe('with a previously confirmed user', () => {
        it('throws an exception', async () => {
          const email = faker.internet.email();
          await prisma.user.create({
            data: {
              confirmation_token: ulid(),
              email,
              graffiti: uuid(),
              country_code: faker.address.countryCode('alpha-3'),
              confirmed_at: new Date(),
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

      describe('with a user that has not been confirmed', () => {
        it('creates a record', async () => {
          const email = faker.internet.email();
          await prisma.user.create({
            data: {
              confirmation_token: ulid(),
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

    it('sends a confirmation email', async () => {
      const sendMail = jest.spyOn(postmarkService, 'send');
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
        }),
      );
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
      const totalPoints = currentMaxPoints + 2;
      const firstUser = await prisma.user.create({
        data: {
          confirmation_token: ulid(),
          confirmed_at: new Date().toISOString(),
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
          total_points: totalPoints,
        },
      });
      const secondUser = await prisma.user.create({
        data: {
          confirmation_token: ulid(),
          confirmed_at: new Date().toISOString(),
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
          total_points: totalPoints,
        },
      });
      const thirdUser = await prisma.user.create({
        data: {
          confirmation_token: ulid(),
          confirmed_at: new Date().toISOString(),
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

  describe('confirm', () => {
    it('updates the confirmation timestamp', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      expect(user.confirmed_at).toBeNull();

      const updatedUser = await usersService.confirm(user);
      expect(updatedUser.confirmed_at).not.toBeNull();
    });
  });
});
