/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { ulid } from 'ulid';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import {
  POINTS_PER_CATEGORY,
  WEEKLY_POINT_LIMITS_BY_EVENT_TYPE,
} from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { EventsService } from './events.service';
import { EventType } from '.prisma/client';

describe('EventsService', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let eventsService: EventsService;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    eventsService = app.get(EventsService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const setupBlockMined = async () => {
    const hash = uuid();
    const sequence = faker.datatype.number();
    const searchable_text = hash + ' ' + String(sequence);

    const block = await prisma.block.create({
      data: {
        hash,
        difficulty: faker.datatype.number(),
        main: true,
        sequence,
        timestamp: new Date(),
        transactions_count: 0,
        graffiti: uuid(),
        previous_block_hash: uuid(),
        network_version: 0,
        searchable_text,
        size: faker.datatype.number(),
      },
    });
    const user = await prisma.user.create({
      data: {
        confirmation_token: ulid(),
        confirmed_at: new Date().toISOString(),
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
          confirmation_token: ulid(),
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
            confirmation_token: ulid(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const { data: records } = await eventsService.list({ userId: user.id });
        expect(records).toHaveLength(0);
      });
    });

    describe('with a user with events', () => {
      describe('with no limit', () => {
        it('returns all the available records', async () => {
          const { events, user } = await setup();
          const { data: records } = await eventsService.list({
            userId: user.id,
          });
          const eventIds = new Set(events.map((event) => event.id));
          const recordIds = new Set(records.map((record) => record.id));
          expect(eventIds).toEqual(recordIds);
        });
      });

      describe('with a limit lower than the number of total records', () => {
        it('returns a paginated chunk equal to the limit', async () => {
          const { user } = await setup();
          const limit = 2;
          const { data: records } = await eventsService.list({
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
          const { data: records } = await eventsService.list({
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
          const { data: records } = await eventsService.list({
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

  describe('getLifetimeEventMetricsForUser', () => {
    it('sums up all the events for the users', async () => {
      const eventCounts: Record<EventType, number> = {
        BLOCK_MINED: 4,
        BUG_CAUGHT: 1,
        COMMUNITY_CONTRIBUTION: 0,
        PULL_REQUEST_MERGED: 2,
        SOCIAL_MEDIA_PROMOTION: 0,
      };
      const user = await prisma.user.create({
        data: {
          confirmation_token: ulid(),
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

      const lifetimeMetrics =
        await eventsService.getLifetimeEventMetricsForUser(user);
      const lifetimeCounts = {
        [EventType.BLOCK_MINED]: lifetimeMetrics[EventType.BLOCK_MINED].count,
        [EventType.BUG_CAUGHT]: lifetimeMetrics[EventType.BUG_CAUGHT].count,
        [EventType.COMMUNITY_CONTRIBUTION]:
          lifetimeMetrics[EventType.COMMUNITY_CONTRIBUTION].count,
        [EventType.PULL_REQUEST_MERGED]:
          lifetimeMetrics[EventType.PULL_REQUEST_MERGED].count,
        [EventType.SOCIAL_MEDIA_PROMOTION]:
          lifetimeMetrics[EventType.SOCIAL_MEDIA_PROMOTION].count,
      };
      expect(lifetimeCounts).toEqual(eventCounts);
    });
  });

  describe('getTotalEventMetricsForUser', () => {
    it('returns sums of event counts within the provided time range', async () => {
      const now = new Date();
      const user = await prisma.user.create({
        data: {
          confirmation_token: ulid(),
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        },
      });
      const eventCountsToReturn: Record<EventType, number> = {
        BLOCK_MINED: 2,
        BUG_CAUGHT: 4,
        COMMUNITY_CONTRIBUTION: 0,
        PULL_REQUEST_MERGED: 3,
        SOCIAL_MEDIA_PROMOTION: 0,
      };
      const eventCountsToIgnore: Record<EventType, number> = {
        BLOCK_MINED: 1,
        BUG_CAUGHT: 1,
        COMMUNITY_CONTRIBUTION: 0,
        PULL_REQUEST_MERGED: 2,
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

      const { eventMetrics, points } =
        await eventsService.getTotalEventMetricsAndPointsForUser(
          user,
          now,
          new Date(now.getTime() + 1000),
        );
      const eventCounts = {
        [EventType.BLOCK_MINED]: eventMetrics[EventType.BLOCK_MINED].count,
        [EventType.BUG_CAUGHT]: eventMetrics[EventType.BUG_CAUGHT].count,
        [EventType.COMMUNITY_CONTRIBUTION]:
          eventMetrics[EventType.COMMUNITY_CONTRIBUTION].count,
        [EventType.PULL_REQUEST_MERGED]:
          eventMetrics[EventType.PULL_REQUEST_MERGED].count,
        [EventType.SOCIAL_MEDIA_PROMOTION]:
          eventMetrics[EventType.SOCIAL_MEDIA_PROMOTION].count,
      };
      expect(eventCounts).toEqual(eventCountsToReturn);
      expect(points).toBe(totalPoints);
    });
  });

  describe('create', () => {
    describe('when the event is after the launch date in production', () => {
      it('does not return null', async () => {
        jest.spyOn(config, 'isProduction').mockImplementationOnce(() => true);

        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const type = EventType.PULL_REQUEST_MERGED;

        const event = await eventsService.create({
          type,
          userId: user.id,
          points: 100,
          occurredAt: new Date(Date.UTC(2021, 10, 1)),
        });
        expect(event).not.toBeNull();
      });
    });

    describe('when the user has hit the weekly limit', () => {
      it('does not increment the total points for a user', async () => {
        const points = 1000;
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
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
            confirmation_token: ulid(),
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
        assert.ok(event);
        expect(event.points).toBe(0);
      });
    });

    describe('when the user will surpass the weekly limit', () => {
      it('increments the total points to not go above weekly limits', async () => {
        const currentPointsThisWeek = 900;
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
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
            confirmation_token: ulid(),
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
        assert.ok(event);
        expect(event.points).toBe(
          WEEKLY_POINT_LIMITS_BY_EVENT_TYPE[type] - currentPointsThisWeek,
        );
      });
    });

    describe('when points are not provided', () => {
      it('defaults to the points specified in the registry', async () => {
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
          },
        });
        const type = EventType.BLOCK_MINED;

        const event = await eventsService.create({
          type,
          userId: user.id,
        });
        expect(event).toMatchObject({
          id: expect.any(Number),
          user_id: user.id,
          points: POINTS_PER_CATEGORY[type],
          type,
        });
      });
    });

    it('increments the total points for a user', async () => {
      const user = await prisma.user.create({
        data: {
          confirmation_token: ulid(),
          confirmed_at: new Date().toISOString(),
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
          confirmation_token: ulid(),
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

  describe('getRankForEventType', () => {
    it('returns the correct rank for a user', async () => {
      const highestBugCaughtAggregate = await prisma.event.aggregate({
        _max: {
          points: true,
        },
        where: {
          type: EventType.BUG_CAUGHT,
        },
      });
      const highestCommunityContributionAggregate =
        await prisma.event.aggregate({
          _max: {
            points: true,
          },
          where: {
            type: EventType.COMMUNITY_CONTRIBUTION,
          },
        });
      const highestBugCaughtPoints = highestBugCaughtAggregate._max.points || 0;
      const highestCommunityContributionPoints =
        highestCommunityContributionAggregate._max.points || 0;
      const firstUser = await prisma.user.create({
        data: {
          confirmation_token: ulid(),
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        },
      });
      const secondUser = await prisma.user.create({
        data: {
          confirmation_token: ulid(),
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        },
      });

      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: firstUser.id,
          occurred_at: new Date(),
          points: 5 * highestBugCaughtPoints + 2,
        },
      });
      await prisma.event.create({
        data: {
          type: EventType.BUG_CAUGHT,
          user_id: secondUser.id,
          occurred_at: new Date(),
          points: 5 * highestBugCaughtPoints + 1,
        },
      });
      await prisma.event.create({
        data: {
          type: EventType.COMMUNITY_CONTRIBUTION,
          user_id: secondUser.id,
          occurred_at: new Date(),
          points: 5 * highestCommunityContributionPoints + 2,
        },
      });
      await prisma.event.create({
        data: {
          type: EventType.COMMUNITY_CONTRIBUTION,
          user_id: firstUser.id,
          occurred_at: new Date(),
          points: 5 * highestCommunityContributionPoints + 1,
        },
      });

      const firstUserRanks = await eventsService.getRanksForEventTypes(
        firstUser,
        prisma,
      );
      expect(firstUserRanks).toMatchObject({
        [EventType.COMMUNITY_CONTRIBUTION]: 2,
        [EventType.BUG_CAUGHT]: 1,
      });

      const secondUserRanks = await eventsService.getRanksForEventTypes(
        secondUser,
        prisma,
      );
      expect(secondUserRanks).toMatchObject({
        [EventType.COMMUNITY_CONTRIBUTION]: 1,
        [EventType.BUG_CAUGHT]: 2,
      });
    });
  });
});
