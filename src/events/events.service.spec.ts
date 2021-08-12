/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { WEEKLY_POINT_LIMITS_BY_EVENT_TYPE } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { EventsService } from './events.service';
import { EventType } from '.prisma/client';

describe('EventsService', () => {
  let app: INestApplication;
  let eventsService: EventsService;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    eventsService = app.get(EventsService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const setupBlockMined = async () => {
    const block = await prisma.block.create({
      data: {
        hash: uuid(),
        difficulty: uuid(),
        main: true,
        sequence: faker.datatype.number(),
        timestamp: new Date(),
        transactions_count: 0,
        graffiti: uuid(),
        previous_block_hash: uuid(),
        network_version: 0,
      },
    });
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      },
    });
    return { block, user };
  };

  const setupBlockMinedWithEvent = async () => {
    const { block, user } = await setupBlockMined();
    const event = await prisma.event.create({
      data: {
        occurred_at: new Date(),
        points: 10,
        type: EventType.BLOCK_MINED,
        block_id: block.id,
        user_id: user.id,
      },
    });
    return { block, event, user };
  };

  describe('list', () => {
    const setup = async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        },
      });
      const firstEvent = await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: user.id,
          occurred_at: new Date(),
          points: 0,
        },
      });
      const secondEvent = await prisma.event.create({
        data: {
          type: EventType.COMMUNITY_CONTRIBUTION,
          user_id: user.id,
          occurred_at: new Date(),
          points: 0,
        },
      });
      const thirdEvent = await prisma.event.create({
        data: {
          type: EventType.SOCIAL_MEDIA_PROMOTION,
          user_id: user.id,
          occurred_at: new Date(),
          points: 0,
        },
      });
      const events = [firstEvent, secondEvent, thirdEvent];
      return { user, events };
    };

    describe('with a user with no events', () => {
      it('returns no records', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const records = await eventsService.list({ userId: user.id });
        expect(records).toHaveLength(0);
      });
    });

    describe('with a user with events', () => {
      describe('with no limit', () => {
        it('returns all the available records', async () => {
          const { events, user } = await setup();
          const records = await eventsService.list({ userId: user.id });
          const eventIds = new Set(events.map((event) => event.id));
          const recordIds = new Set(records.map((record) => record.id));
          expect(eventIds).toEqual(recordIds);
        });
      });

      describe('with a limit lower than the number of total records', () => {
        it('returns a paginated chunk equal to the limit', async () => {
          const { user } = await setup();
          const limit = 2;
          const records = await eventsService.list({
            userId: user.id,
            limit,
          });
          expect(records).toHaveLength(limit);
          for (const record of records) {
            expect(record.user_id).toBe(user.id);
          }
        });
      });

      describe('with the before cursor', () => {
        it('returns records before the cursor', async () => {
          const { events, user } = await setup();
          events.reverse();
          const lastEventId = events[0].id;
          const records = await eventsService.list({
            userId: user.id,
            before: lastEventId,
          });
          for (const record of records) {
            expect(record.id).toBeLessThan(lastEventId);
            expect(record.user_id).toBe(user.id);
          }
        });
      });

      describe('with the after cursor', () => {
        it('returns records after the cursor', async () => {
          const { events, user } = await setup();
          const firstEventId = events[0].id;
          const records = await eventsService.list({
            userId: user.id,
            after: firstEventId,
          });
          for (const record of records) {
            expect(record.id).toBeGreaterThan(firstEventId);
            expect(record.user_id).toBe(user.id);
          }
        });
      });
    });
  });

  describe('getLifetimeEventCountsForUser', () => {
    it('sums up all the events for the users', async () => {
      const eventCounts: Record<EventType, number> = {
        BLOCK_MINED: 4,
        BUG_CAUGHT: 1,
        COMMUNITY_CONTRIBUTION: 2,
        NODE_HOSTED: 1,
        PULL_REQUEST_MERGED: 0,
        SOCIAL_MEDIA_PROMOTION: 0,
      };
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        },
      });

      for (const [eventType, count] of Object.entries(eventCounts)) {
        for (let i = 0; i < count; i++) {
          await prisma.event.create({
            data: {
              user_id: user.id,
              type: EventType[eventType as keyof typeof EventType],
              occurred_at: new Date(),
              points: 0,
            },
          });
        }
      }

      const lifetimeCounts = await eventsService.getLifetimeEventCountsForUser(
        user,
      );
      expect(lifetimeCounts).toEqual(eventCounts);
    });
  });

  describe('getTotalEventCountsForUser', () => {
    it('returns sums of event counts within the provided time range', async () => {
      const now = new Date();
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        },
      });
      const eventCountsToReturn: Record<EventType, number> = {
        BLOCK_MINED: 2,
        BUG_CAUGHT: 4,
        COMMUNITY_CONTRIBUTION: 3,
        NODE_HOSTED: 1,
        PULL_REQUEST_MERGED: 0,
        SOCIAL_MEDIA_PROMOTION: 0,
      };
      const eventCountsToIgnore: Record<EventType, number> = {
        BLOCK_MINED: 1,
        BUG_CAUGHT: 1,
        COMMUNITY_CONTRIBUTION: 2,
        NODE_HOSTED: 1,
        PULL_REQUEST_MERGED: 0,
        SOCIAL_MEDIA_PROMOTION: 2,
      };
      let totalPoints = 0;

      for (const [eventType, count] of Object.entries(eventCountsToReturn)) {
        for (let i = 0; i < count; i++) {
          const pointsForEvent = Math.floor(Math.random() * 10);
          await prisma.event.create({
            data: {
              user_id: user.id,
              type: EventType[eventType as keyof typeof EventType],
              occurred_at: new Date(now.getTime() + 1),
              points: pointsForEvent,
            },
          });
          totalPoints += pointsForEvent;
        }
      }

      for (const [eventType, count] of Object.entries(eventCountsToIgnore)) {
        for (let i = 0; i < count; i++) {
          await prisma.event.create({
            data: {
              user_id: user.id,
              type: EventType[eventType as keyof typeof EventType],
              occurred_at: new Date(now.getTime() - 1),
              points: 10,
            },
          });
        }
      }

      const { eventCounts, points } =
        await eventsService.getTotalEventCountsAndPointsForUser(
          user,
          now,
          new Date(now.getTime() + 1000),
        );
      expect(eventCounts).toEqual(eventCountsToReturn);
      expect(points).toBe(totalPoints);
    });
  });

  describe('create', () => {
    describe('when the user has hit the weekly limit', () => {
      it('does not increment the total points for a user', async () => {
        const points = 1000;
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const currentPoints = user.total_points;
        const type = EventType.PULL_REQUEST_MERGED;
        await prisma.event.create({
          data: {
            user_id: user.id,
            occurred_at: new Date(),
            points,
            type,
          },
        });

        await eventsService.create({ type, userId: user.id, points: 100 });
        const updatedUser = await usersService.findOrThrow(user.id);
        expect(updatedUser.total_points).toBe(currentPoints);
      });

      it('updates the event points to 0', async () => {
        const points = 1000;
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const type = EventType.PULL_REQUEST_MERGED;
        await prisma.event.create({
          data: {
            user_id: user.id,
            occurred_at: new Date(),
            points,
            type,
          },
        });

        const event = await eventsService.create({
          type,
          userId: user.id,
          points: 100,
        });
        expect(event.points).toBe(0);
      });
    });

    describe('when the user will surpass the weekly limit', () => {
      it('increments the total points to not go above weekly limits', async () => {
        const currentPointsThisWeek = 900;
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            total_points: currentPointsThisWeek,
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const type = EventType.PULL_REQUEST_MERGED;
        await prisma.event.create({
          data: {
            user_id: user.id,
            occurred_at: new Date(),
            points: currentPointsThisWeek,
            type,
          },
        });

        const points = 200;
        await eventsService.create({ type, userId: user.id, points });
        const updatedUser = await usersService.findOrThrow(user.id);
        expect(updatedUser.total_points).toBe(
          WEEKLY_POINT_LIMITS_BY_EVENT_TYPE[type],
        );
      });

      it('adjusts the points for the event', async () => {
        const currentPointsThisWeek = 900;
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const type = EventType.PULL_REQUEST_MERGED;
        await prisma.event.create({
          data: {
            user_id: user.id,
            occurred_at: new Date(),
            points: currentPointsThisWeek,
            type,
          },
        });

        const points = 200;
        const event = await eventsService.create({
          type,
          userId: user.id,
          points,
        });
        expect(event.points).toBe(
          WEEKLY_POINT_LIMITS_BY_EVENT_TYPE[type] - currentPointsThisWeek,
        );
      });
    });

    it('increments the total points for a user', async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        },
      });
      const currentPoints = user.total_points;
      const points = 100;

      await eventsService.create({
        type: EventType.BLOCK_MINED,
        userId: user.id,
        points,
      });
      const updatedUser = await usersService.findOrThrow(user.id);
      expect(updatedUser.total_points).toBe(currentPoints + points);
    });

    it('stores an event record', async () => {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        },
      });
      const type = EventType.BLOCK_MINED;
      const points = 100;

      const event = await eventsService.create({
        type,
        userId: user.id,
        points,
      });
      expect(event).toMatchObject({
        id: expect.any(Number),
        user_id: user.id,
        points,
        type,
      });
    });
  });

  describe('upsertBlockMined', () => {
    describe('when a block exists', () => {
      it('returns the record', async () => {
        const { block, event, user } = await setupBlockMinedWithEvent();
        const record = await eventsService.upsertBlockMined(
          block,
          user,
          prisma,
        );
        expect(record).toMatchObject(event);
      });

      it('does not create a record', async () => {
        const { block, user } = await setupBlockMined();
        await eventsService.upsertBlockMined(block, user, prisma);
        const create = jest.spyOn(eventsService, 'create');
        expect(create).not.toHaveBeenCalled();
      });
    });

    describe('for a new block', () => {
      it('creates a record', async () => {
        const { block, user } = await setupBlockMined();
        const create = jest.spyOn(eventsService, 'createWithClient');
        await eventsService.upsertBlockMined(block, user, prisma);

        expect(create).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalledWith(
          {
            blockId: block.id,
            points: expect.any(Number),
            occurredAt: expect.any(Date),
            type: EventType.BLOCK_MINED,
            userId: user.id,
          },
          prisma,
        );
      });
    });
  });

  describe('deleteBlockMined', () => {
    describe('when the event does not exist', () => {
      it('returns null', async () => {
        const { block, user } = await setupBlockMined();
        expect(
          await eventsService.deleteBlockMined(block, user, prisma),
        ).toBeNull();
      });
    });

    describe('when the event exists', () => {
      it('deletes the record', async () => {
        const { block, event, user } = await setupBlockMinedWithEvent();
        const record = await eventsService.deleteBlockMined(
          block,
          user,
          prisma,
        );
        expect(record).toMatchObject({
          ...event,
          deleted_at: expect.any(Date),
          updated_at: expect.any(Date),
          points: 0,
        });
      });

      it('subtracts points from the user total points', async () => {
        const { block, event, user } = await setupBlockMinedWithEvent();
        await eventsService.deleteBlockMined(block, user, prisma);
        const updatedUser = await usersService.findOrThrow(user.id);
        expect(updatedUser.total_points).toBe(user.total_points - event.points);
      });
    });
  });
});
