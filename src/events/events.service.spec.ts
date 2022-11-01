/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication, NotFoundException } from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { serializedBlockFromRecord } from '../blocks/utils/block-translator';
import { POINTS_PER_CATEGORY } from '../common/constants';
import { EventsJobsController } from '../events/events.jobs.controller';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UserPointsService } from '../user-points/user-points.service';
import { UsersService } from '../users/users.service';
import { EventsService } from './events.service';
import { EventType, User } from '.prisma/client';

describe('EventsService', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let eventsService: EventsService;
  let prisma: PrismaService;
  let userPointsService: UserPointsService;
  let usersService: UsersService;
  let graphileWorkerService: GraphileWorkerService;
  let addJob: jest.SpyInstance;
  let eventsJobsController: EventsJobsController;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    eventsService = app.get(EventsService);
    prisma = app.get(PrismaService);
    userPointsService = app.get(UserPointsService);
    usersService = app.get(UsersService);
    graphileWorkerService = app.get(GraphileWorkerService);
    eventsJobsController = app.get(EventsJobsController);
    await app.init();
  });

  beforeEach(() => {
    addJob = jest
      .spyOn(graphileWorkerService, 'addJob')
      .mockImplementationOnce(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const setupUser = async (points?: number): Promise<User> => {
    const user = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      country_code: faker.address.countryCode('alpha-3'),
    });
    await userPointsService.upsert({
      userId: user.id,
      totalPoints: points ?? POINTS_PER_CATEGORY.BLOCK_MINED,
    });
    return user;
  };

  const setupBlockMined = async (points?: number) => {
    const hash = uuid();
    const sequence = faker.datatype.number();

    const block = await prisma.block.create({
      data: {
        hash,
        main: true,
        sequence,
        timestamp: new Date(),
        transactions_count: 0,
        graffiti: uuid(),
        previous_block_hash: uuid(),
        network_version: 0,
        size: faker.datatype.number(),
        difficulty: faker.datatype.number(),
      },
    });
    const user = await setupUser(points);
    return { block, user };
  };

  const setupBlockMinedWithEvent = async (points?: number) => {
    const { block, user } = await setupBlockMined(points);
    const event = await prisma.event.create({
      data: {
        occurred_at: new Date(),
        points: points ?? POINTS_PER_CATEGORY.BLOCK_MINED,
        type: EventType.BLOCK_MINED,
        block_id: block.id,
        user_id: user.id,
      },
    });
    return { block, event, user };
  };

  describe('findOrThrow', () => {
    describe('with a valid id', () => {
      it('returns the record', async () => {
        const { event } = await setupBlockMinedWithEvent();
        const record = await eventsService.findOrThrow(event.id);
        expect(record).not.toBeNull();
        expect(record).toMatchObject(event);
      });
    });

    describe('with a missing id', () => {
      it('throws a NotFoundException', async () => {
        await expect(eventsService.findOrThrow(100000)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('list', () => {
    const setup = async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
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
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        const { data: records } = await eventsService.list({ userId: user.id });
        expect(records).toHaveLength(0);
      });
    });

    describe('with a user with events', () => {
      describe('with no limit', () => {
        it('returns all the available records sorted by `occurred_at`', async () => {
          const { events, user } = await setup();
          const { data: records } = await eventsService.list({
            userId: user.id,
          });

          for (let i = 1; i < records.length; i++) {
            expect(
              records[i - 1].occurred_at.getUTCMilliseconds(),
            ).toBeGreaterThanOrEqual(
              records[i].occurred_at.getUTCMilliseconds(),
            );
          }

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

      describe('with block mined events', () => {
        it('returns the block as metadata', async () => {
          const { block, user } = await setupBlockMinedWithEvent();
          const { data: records } = await eventsService.list({
            userId: user.id,
          });
          for (const record of records) {
            expect(record.metadata).toMatchObject(
              serializedBlockFromRecord(block),
            );
          }
        });
      });
    });
  });

  describe('getUpsertPointsOptions', () => {
    it('returns latest points, timestamps, and total points for a user', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      const eventA = await eventsService.create({
        type: EventType.PULL_REQUEST_MERGED,
        userId: user.id,
        points: 100,
      });
      const eventB = await eventsService.create({
        type: EventType.PULL_REQUEST_MERGED,
        userId: user.id,
        points: 200,
      });
      const eventC = await eventsService.create({
        type: EventType.BUG_CAUGHT,
        userId: user.id,
        points: 200,
      });
      const eventD = await eventsService.create({
        type: EventType.SOCIAL_MEDIA_PROMOTION,
        userId: user.id,
        points: 300,
      });
      const eventE = await eventsService.create({
        type: EventType.NODE_UPTIME,
        userId: user.id,
        points: 300,
      });
      const eventF = await eventsService.create({
        type: EventType.SEND_TRANSACTION,
        userId: user.id,
        points: 300,
      });
      assert.ok(eventA);
      assert.ok(eventB);
      assert.ok(eventC);
      assert.ok(eventD);
      assert.ok(eventE);
      assert.ok(eventF);

      const options = await eventsService.getUpsertPointsOptions(user);
      expect(options).toMatchObject({
        totalPoints:
          eventA.points +
          eventB.points +
          eventC.points +
          eventD.points +
          eventE.points +
          eventF.points,
        points: {
          BLOCK_MINED: {
            points: 0,
            latestOccurredAt: null,
          },
          BUG_CAUGHT: {
            points: eventC.points,
            latestOccurredAt: eventC.occurred_at,
          },
          COMMUNITY_CONTRIBUTION: {
            points: 0,
            latestOccurredAt: null,
          },
          NODE_UPTIME: {
            points: eventE.points,
            latestOccurredAt: eventE.occurred_at,
          },
          PULL_REQUEST_MERGED: {
            points: eventA.points + eventB.points,
            latestOccurredAt: eventB.occurred_at,
          },
          SEND_TRANSACTION: {
            points: eventF.points,
            latestOccurredAt: eventF.occurred_at,
          },
          SOCIAL_MEDIA_PROMOTION: {
            points: eventD.points,
            latestOccurredAt: eventD.occurred_at,
          },
        },
      });
    });
  });

  describe('getTotalEventMetricsForUser', () => {
    it('returns sums of event counts within the provided time range', async () => {
      const now = new Date();
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      const eventCountsToReturn: Record<EventType, number> = {
        BLOCK_MINED: 2,
        BUG_CAUGHT: 4,
        COMMUNITY_CONTRIBUTION: 0,
        PULL_REQUEST_MERGED: 3,
        SOCIAL_MEDIA_PROMOTION: 0,
        NODE_UPTIME: 0,
        SEND_TRANSACTION: 0,
      };
      const eventCountsToIgnore: Record<EventType, number> = {
        BLOCK_MINED: 1,
        BUG_CAUGHT: 1,
        COMMUNITY_CONTRIBUTION: 0,
        PULL_REQUEST_MERGED: 2,
        SOCIAL_MEDIA_PROMOTION: 2,
        NODE_UPTIME: 0,
        SEND_TRANSACTION: 0,
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
        [EventType.NODE_UPTIME]: eventMetrics[EventType.NODE_UPTIME].count,
        [EventType.SEND_TRANSACTION]:
          eventMetrics[EventType.SEND_TRANSACTION].count,
      };
      expect(eventCounts).toEqual(eventCountsToReturn);
      expect(points).toBe(totalPoints);
    });
  });

  describe('create', () => {
    describe('when the event is before the phase one launch', () => {
      it('returns null', async () => {
        jest.spyOn(config, 'get').mockImplementationOnce(() => true);

        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        const type = EventType.PULL_REQUEST_MERGED;

        const event = await eventsService.create({
          type,
          userId: user.id,
          points: 100,
          occurredAt: new Date(Date.UTC(2021, 10, 1)),
        });
        expect(event).toBeNull();
      });
    });

    describe('when the event is after the end of phase one', () => {
      it('returns null', async () => {
        jest.spyOn(config, 'get').mockImplementationOnce(() => true);

        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        const type = EventType.PULL_REQUEST_MERGED;

        const event = await eventsService.create({
          type,
          userId: user.id,
          points: 100,
          occurredAt: new Date(Date.UTC(2022, 2, 15)),
        });
        expect(event).toBeNull();
      });
    });

    describe('when `CHECK_OCCURRED_AT` is disabled and `occurred_at` is outside phase bounds', () => {
      it('creates the event', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
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

    describe('when points are not provided', () => {
      it('defaults to the points specified in the registry', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
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
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      const points = 100;

      await eventsService.create({
        type: EventType.BLOCK_MINED,
        userId: user.id,
        points,
      });
      await eventsJobsController.updateLatestPoints({
        userId: user.id,
        type: EventType.BLOCK_MINED,
      });

      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.UPDATE_LATEST_POINTS,
        {
          userId: user.id,
          type: EventType.BLOCK_MINED,
        },
        expect.objectContaining({
          jobKey: expect.any(String),
          jobKeyMode: expect.any(String),
          queueName: expect.any(String),
          runAt: expect.any(Date),
        }),
      );

      const userPoints = await userPointsService.findOrThrow(user.id);
      expect(userPoints.total_points).toBe(points);
    });

    it('stores an event record', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
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

    describe('for a new URL', () => {
      it('creates a new event', async () => {
        const points = 100;
        const user = await setupUser(points);
        const type = EventType.PULL_REQUEST_MERGED;
        const url = `https://github.com/iron-fish/ironfish/pull/${uuid().toString()}`;

        const event = await eventsService.create({
          type,
          userId: user.id,
          points,
          url,
        });
        expect(event).toMatchObject({
          id: expect.any(Number),
          user_id: user.id,
          points,
          type,
          url,
        });
      });
    });

    describe('for a duplicate URL', () => {
      it('returns the existing event', async () => {
        const points = 100;
        const user1 = await setupUser(points);
        const user2 = await setupUser(points);

        const type = EventType.PULL_REQUEST_MERGED;
        const url = `https://github.com/iron-fish/ironfish/pull/${uuid().toString()}`;

        const event = await eventsService.create({
          type,
          userId: user1.id,
          points,
          url,
        });
        const duplicateEvent = await eventsService.create({
          type,
          userId: user2.id,
          points,
          url,
        });
        expect(event).toStrictEqual(duplicateEvent);
      });
    });

    describe('for recreating an event', () => {
      it('after deleting an event, creation of a different event with same url is allowed', async () => {
        const points = 100;
        const user = await setupUser(points);

        const type = EventType.COMMUNITY_CONTRIBUTION;
        const url = `https://twitter.com/brahitoz/status/1494793514839953413?s=20&t=sB0r4-R1ijn7J9kxS3YqPQ`;

        const event = await eventsService.create({
          type,
          userId: user.id,
          points,
          url,
        });
        assert(event);
        const eventToDelete = await eventsService.findOrThrow(event.id);
        await eventsService.delete(eventToDelete);

        const newPoints = 500;
        const event2 = await eventsService.create({
          type,
          userId: user.id,
          points: newPoints,
          url,
        });

        expect(event2?.points).toStrictEqual(newPoints);
      });
    });

    it('updates the points for the user', async () => {
      const user = await setupUser();
      const blockMinedEvent = await eventsService.create({
        type: EventType.BLOCK_MINED,
        userId: user.id,
      });
      assert.ok(blockMinedEvent);

      const points = 50;
      const type = EventType.PULL_REQUEST_MERGED;
      const url = `https://github.com/iron-fish/ironfish/pull/${uuid().toString()}`;
      const upsertPoints = jest.spyOn(userPointsService, 'upsertWithClient');

      const event = await eventsService.create({
        type,
        userId: user.id,
        points,
        url,
      });
      await eventsJobsController.updateLatestPoints({
        userId: user.id,
        type: EventType.PULL_REQUEST_MERGED,
      });

      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.UPDATE_LATEST_POINTS,
        {
          userId: user.id,
          type: EventType.PULL_REQUEST_MERGED,
        },
        expect.objectContaining({
          jobKey: expect.any(String),
          jobKeyMode: expect.any(String),
          queueName: expect.any(String),
          runAt: expect.any(Date),
        }),
      );

      assert.ok(event);
      expect(upsertPoints).toHaveBeenCalledTimes(1);
      assert.ok(upsertPoints.mock.calls);
      expect(upsertPoints.mock.calls[0][0].userId).toBe(user.id);
      expect(upsertPoints.mock.calls[0][0].totalPoints).toBe(
        points + blockMinedEvent.points,
      );
      expect(upsertPoints.mock.calls[0][0].points).toEqual({
        [type]: {
          points,
          count: 1,
          latestOccurredAt: event.occurred_at,
        },
      });
    });
  });

  describe('upsertBlockMined', () => {
    describe('when a block exists', () => {
      it('returns the record', async () => {
        const { block, event, user } = await setupBlockMinedWithEvent();
        const record = await eventsService.upsertBlockMined(block, user);
        expect(record).toMatchObject(event);
      });

      it('does not create a record', async () => {
        const { block, user } = await setupBlockMined();
        await eventsService.upsertBlockMined(block, user);
        const create = jest.spyOn(eventsService, 'create');
        expect(create).not.toHaveBeenCalled();
      });
    });

    describe('for a new block', () => {
      it('creates a record', async () => {
        const { block, user } = await setupBlockMined();
        const create = jest.spyOn(eventsService, 'create');
        await eventsService.upsertBlockMined(block, user);

        expect(create).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalledWith({
          blockId: block.id,
          points: expect.any(Number),
          occurredAt: expect.any(Date),
          type: EventType.BLOCK_MINED,
          userId: user.id,
        });
      });
    });

    describe('when the sequence is after the end of phase one', () => {
      it('returns null', async () => {
        const { block, user } = await setupBlockMined();
        block.sequence = 150001;
        const event = await eventsService.upsertBlockMined(block, user);
        expect(event).toBeNull();
      });
    });

    describe('when `ALLOW_BLOCK_MINED_POINTS` is false', () => {
      it('returns null', async () => {
        jest.spyOn(config, 'get').mockImplementationOnce(() => false);
        const { block, user } = await setupBlockMined();
        const event = await eventsService.upsertBlockMined(block, user);
        expect(event).toBeNull();
      });
    });
  });

  describe('deleteBlockMined', () => {
    describe('when the event does not exist', () => {
      it('returns null', async () => {
        const { block } = await setupBlockMined();
        expect(await eventsService.deleteBlockMined(block)).toBeNull();
      });
    });

    describe('when the event exists', () => {
      it('deletes the record', async () => {
        const { block, event } = await setupBlockMinedWithEvent();
        await eventsService.deleteBlockMined(block);
        await expect(eventsService.findOrThrow(event.id)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('subtracts points from the user total points', async () => {
        const { block, event, user } = await setupBlockMinedWithEvent();
        const currentUserPoints = await userPointsService.findOrThrow(user.id);
        await eventsService.deleteBlockMined(block);
        await eventsJobsController.updateLatestPoints({
          userId: user.id,
          type: EventType.BLOCK_MINED,
        });

        expect(addJob).toHaveBeenCalledWith(
          GraphileWorkerPattern.UPDATE_LATEST_POINTS,
          {
            userId: user.id,
            type: EventType.BLOCK_MINED,
          },
          expect.objectContaining({
            jobKey: expect.any(String),
            jobKeyMode: expect.any(String),
            queueName: expect.any(String),
            runAt: expect.any(Date),
          }),
        );

        const userPoints = await userPointsService.findOrThrow(user.id);
        expect(userPoints.total_points).toBe(
          currentUserPoints.total_points - event.points,
        );
      });
    });
  });

  describe('delete', () => {
    it('deletes the record', async () => {
      const { block, event } = await setupBlockMinedWithEvent();
      await eventsService.deleteBlockMined(block);
      await expect(eventsService.findOrThrow(event.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('subtracts points from the user total points', async () => {
      const { event, user } = await setupBlockMinedWithEvent();
      const currentUserPoints = await userPointsService.findOrThrow(user.id);
      await eventsService.delete(event);
      await eventsJobsController.updateLatestPoints({
        userId: user.id,
        type: EventType.BLOCK_MINED,
      });

      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.UPDATE_LATEST_POINTS,
        {
          userId: user.id,
          type: EventType.BLOCK_MINED,
        },
        expect.objectContaining({
          jobKey: expect.any(String),
          jobKeyMode: expect.any(String),
          queueName: expect.any(String),
          runAt: expect.any(Date),
        }),
      );

      const userPoints = await userPointsService.findOrThrow(user.id);
      expect(userPoints.total_points).toBe(
        currentUserPoints.total_points - event.points,
      );
    });

    it('subtracts points from user_points total points', async () => {
      const { event, user } = await setupBlockMinedWithEvent();
      const currentUserPoints = await userPointsService.findOrThrow(user.id);
      await eventsService.delete(event);
      await eventsJobsController.updateLatestPoints({
        userId: user.id,
        type: EventType.BLOCK_MINED,
      });

      expect(addJob).toHaveBeenCalledWith(
        GraphileWorkerPattern.UPDATE_LATEST_POINTS,
        {
          userId: user.id,
          type: EventType.BLOCK_MINED,
        },
        expect.objectContaining({
          jobKey: expect.any(String),
          jobKeyMode: expect.any(String),
          queueName: expect.any(String),
          runAt: expect.any(Date),
        }),
      );

      const updatedUserPoints = await userPointsService.findOrThrow(user.id);
      expect(updatedUserPoints.total_points).toBe(
        currentUserPoints.total_points - event.points,
      );
    });
  });

  describe('createNodeUptimeEventWithClient', () => {
    it('creates a node uptime event', async () => {
      const user = await setupUser();
      const record = await eventsService.createNodeUptimeEventWithClient(
        user,
        new Date(),
        prisma,
      );
      expect(record).toMatchObject({
        type: EventType.NODE_UPTIME,
        points: POINTS_PER_CATEGORY[EventType.NODE_UPTIME],
        user_id: user.id,
      });
    });
  });
});
