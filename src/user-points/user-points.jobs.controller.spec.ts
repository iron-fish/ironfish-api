/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { Job } from 'graphile-worker';
import { v4 as uuid } from 'uuid';
import { EventsService } from '../events/events.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { GraphileWorkerJobOptions } from '../graphile-worker/interfaces/graphile-worker-job-options';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { UserPointsJobsController } from './user-points.jobs.controller';
import { UserPointsService } from './user-points.service';

describe('UserPointsJobsController', () => {
  let app: INestApplication;
  let eventsService: EventsService;
  let graphileWorkerService: GraphileWorkerService;
  let userPointsJobsController: UserPointsJobsController;
  let userPointsService: UserPointsService;
  let usersService: UsersService;

  let addJob: jest.SpyInstance<
    Promise<Job>,
    [GraphileWorkerPattern, unknown?, GraphileWorkerJobOptions?]
  >;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    eventsService = app.get(EventsService);
    graphileWorkerService = app.get(GraphileWorkerService);
    userPointsJobsController = app.get(UserPointsJobsController);
    userPointsService = app.get(UserPointsService);
    usersService = app.get(UsersService);

    addJob = jest
      .spyOn(graphileWorkerService, 'addJob')
      .mockImplementation(jest.fn());

    await app.init();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('refreshUsersPoints', () => {
    it('enqueues jobs to refresh points for every user', async () => {
      const userA = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      const userB = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      jest
        .spyOn(usersService, 'list')
        .mockImplementationOnce(() =>
          Promise.resolve({ data: [userA], hasPrevious: false, hasNext: true }),
        )
        .mockImplementationOnce(() =>
          Promise.resolve({ data: [userB], hasPrevious: true, hasNext: false }),
        );

      await userPointsJobsController.refreshUsersPoints();
      expect(addJob).toHaveBeenCalledTimes(2);
      assert.ok(addJob.mock.calls);
      expect(addJob.mock.calls[0][0]).toBe(
        GraphileWorkerPattern.REFRESH_USER_POINTS,
      );
      expect(addJob.mock.calls[0][1]).toEqual({ userId: userA.id });
      expect(addJob.mock.calls[1][0]).toBe(
        GraphileWorkerPattern.REFRESH_USER_POINTS,
      );
      expect(addJob.mock.calls[1][1]).toEqual({ userId: userB.id });
    });

    it('does not requeue', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      jest
        .spyOn(usersService, 'list')
        .mockImplementationOnce(() =>
          Promise.resolve({ data: [user], hasPrevious: false, hasNext: false }),
        );

      const { requeue } = await userPointsJobsController.refreshUsersPoints();
      expect(requeue).toBe(false);
    });
  });

  describe('refreshUserPoints', () => {
    describe('for an invalid user', () => {
      it('does not requeue', async () => {
        const { requeue } = await userPointsJobsController.refreshUserPoints({
          userId: 50000,
        });
        expect(requeue).toBe(false);
      });
    });

    it('upserts user points', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      const options = {
        userId: user.id,
        totalPoints: 100,
        points: {
          BLOCK_MINED: {
            points: 50,
            count: 1,
            latestOccurredAt: new Date(),
          },
          BUG_CAUGHT: {
            points: 50,
            count: 1,
            latestOccurredAt: new Date(),
          },
          COMMUNITY_CONTRIBUTION: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          PULL_REQUEST_MERGED: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          SOCIAL_MEDIA_PROMOTION: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          NODE_UPTIME: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          SEND_TRANSACTION: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
        },
      };
      jest
        .spyOn(eventsService, 'getUpsertPointsOptions')
        .mockImplementationOnce(() => Promise.resolve(options));
      const upsert = jest
        .spyOn(userPointsService, 'upsert')
        .mockImplementationOnce(jest.fn());

      await userPointsJobsController.refreshUserPoints({ userId: user.id });
      expect(upsert).toHaveBeenCalledWith(options);
    });

    it('does not requeue', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        country_code: faker.address.countryCode('alpha-3'),
      });
      const options = {
        userId: user.id,
        totalPoints: 100,
        points: {
          BLOCK_MINED: {
            points: 50,
            count: 1,
            latestOccurredAt: new Date(),
          },
          BUG_CAUGHT: {
            points: 50,
            count: 1,
            latestOccurredAt: new Date(),
          },
          COMMUNITY_CONTRIBUTION: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          PULL_REQUEST_MERGED: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          SOCIAL_MEDIA_PROMOTION: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          NODE_UPTIME: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          SEND_TRANSACTION: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
        },
      };
      jest
        .spyOn(eventsService, 'getUpsertPointsOptions')
        .mockImplementationOnce(() => Promise.resolve(options));
      jest.spyOn(userPointsService, 'upsert').mockImplementationOnce(jest.fn());

      const { requeue } = await userPointsJobsController.refreshUserPoints({
        userId: user.id,
      });
      expect(requeue).toBe(false);
    });
  });
});
