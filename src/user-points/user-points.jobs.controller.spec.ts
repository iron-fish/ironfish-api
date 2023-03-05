/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { Job } from 'graphile-worker';
import { v4 as uuid } from 'uuid';
import { MetricsGranularity } from '../common/enums/metrics-granularity';
import { EventsService } from '../events/events.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { GraphileWorkerJobOptions } from '../graphile-worker/interfaces/graphile-worker-job-options';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { PhaseOneSerializedUserMetrics } from './interfaces/phase-one-serialized-user-metrics';
import { PhaseTwoSerializedUserMetrics } from './interfaces/phase-two-serialized-user-metrics ';
import { UserPointsJobsController } from './user-points.jobs.controller';
import { UserPointsService } from './user-points.service';
import { EventType } from '.prisma/client';

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
        countryCode: faker.address.countryCode('alpha-3'),
      });
      const userB = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
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
        countryCode: faker.address.countryCode('alpha-3'),
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
      jest
        .spyOn(userPointsJobsController, 'getPhaseOnePoints')
        .mockImplementationOnce(async () => {
          return Promise.resolve(undefined);
        });
      jest
        .spyOn(userPointsJobsController, 'getPhaseTwoPoints')
        .mockImplementationOnce(async () => {
          return Promise.resolve(undefined);
        });

      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
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
          MULTI_ASSET_MINT: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          MULTI_ASSET_BURN: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          MULTI_ASSET_TRANSFER: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          POOL4: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
        },
      };
      jest
        .spyOn(eventsService, 'getUpsertPointsOptions')
        .mockImplementationOnce(() => Promise.resolve(options));
      const upsert = jest.spyOn(userPointsService, 'upsert');

      await userPointsJobsController.refreshUserPoints({ userId: user.id });
      expect(upsert).toHaveBeenCalledWith(options);
    });

    it('does not requeue', async () => {
      jest
        .spyOn(userPointsJobsController, 'getPhaseOnePoints')
        .mockImplementationOnce(() => {
          return Promise.resolve(undefined);
        });
      jest
        .spyOn(userPointsJobsController, 'getPhaseTwoPoints')
        .mockImplementationOnce(async () => {
          return Promise.resolve(undefined);
        });

      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
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
          MULTI_ASSET_MINT: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          MULTI_ASSET_BURN: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          MULTI_ASSET_TRANSFER: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
          POOL4: {
            points: 0,
            count: 0,
            latestOccurredAt: new Date(),
          },
        },
      };
      jest
        .spyOn(eventsService, 'getUpsertPointsOptions')
        .mockImplementationOnce(() => Promise.resolve(options));

      const { requeue } = await userPointsJobsController.refreshUserPoints({
        userId: user.id,
      });
      expect(requeue).toBe(false);
    });

    describe('if previous pool points are null', () => {
      describe('when the previous APIs send valid responses', () => {
        it('fetches data from phase one and phase two', async () => {
          const phaseOneMetrics = {
            blocks_mined: { count: 5, points: 500, rank: 4843 },
            bugs_caught: { count: 0, points: 0, rank: 71 },
            community_contributions: { count: 0, points: 0, rank: 697 },
            pull_requests_merged: { count: 0, points: 0, rank: 39 },
            social_media_contributions: { count: 0, points: 0, rank: 298 },
          };
          jest
            .spyOn(userPointsJobsController, 'getPhaseOnePoints')
            .mockImplementationOnce(() => {
              return Promise.resolve<PhaseOneSerializedUserMetrics>({
                user_id: user.id,
                granularity: MetricsGranularity.LIFETIME,
                points: 500,
                metrics: phaseOneMetrics,
              });
            });

          const phaseTwoMetrics = {
            bugs_caught: { count: 0, points: 0 },
            pull_requests_merged: { count: 0, points: 0 },
            node_uptime: { count: 11, points: 110 },
            send_transaction: { count: 1, points: 1 },
          };
          jest
            .spyOn(userPointsJobsController, 'getPhaseTwoPoints')
            .mockImplementationOnce(() => {
              return Promise.resolve<PhaseTwoSerializedUserMetrics>({
                user_id: user.id,
                granularity: MetricsGranularity.LIFETIME,
                points: 111,
                metrics: phaseTwoMetrics,
              });
            });

          const user = await usersService.create({
            email: faker.internet.email(),
            graffiti: uuid(),
            countryCode: faker.address.countryCode('alpha-3'),
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
                points: 250,
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
              MULTI_ASSET_MINT: {
                points: 0,
                count: 0,
                latestOccurredAt: new Date(),
              },
              MULTI_ASSET_BURN: {
                points: 0,
                count: 0,
                latestOccurredAt: new Date(),
              },
              MULTI_ASSET_TRANSFER: {
                points: 0,
                count: 0,
                latestOccurredAt: new Date(),
              },
              POOL4: {
                points: 0,
                count: 0,
                latestOccurredAt: new Date(),
              },
            },
          };
          jest
            .spyOn(eventsService, 'getUpsertPointsOptions')
            .mockImplementationOnce(() => Promise.resolve(options));

          await userPointsJobsController.refreshUserPoints({ userId: user.id });

          const userPoints = await userPointsService.findOrThrow(user.id);
          expect(userPoints).toMatchObject({
            pool1_points:
              phaseOneMetrics.blocks_mined.points +
              phaseOneMetrics.community_contributions.points +
              phaseOneMetrics.social_media_contributions.points +
              phaseOneMetrics.bugs_caught.points,
            pool2_points:
              phaseTwoMetrics.bugs_caught.points +
              phaseTwoMetrics.node_uptime.points +
              phaseTwoMetrics.send_transaction.points,
            pool3_points: options.points.PULL_REQUEST_MERGED.points,
          });
        });
      });

      describe('when the API returns an exception', () => {
        it('retries the job', async () => {
          const user = await usersService.create({
            email: faker.internet.email(),
            graffiti: uuid(),
            countryCode: faker.address.countryCode('alpha-3'),
          });

          jest
            .spyOn(userPointsJobsController, 'getPhaseOnePoints')
            .mockImplementationOnce(() => {
              throw new Error();
            });

          await expect(
            userPointsJobsController.refreshUserPoints({ userId: user.id }),
          ).rejects.toBeDefined();
        });
      });
    });
  });

  describe('refreshPool4Points', () => {
    it('refreshes pool 4 points for a given user', async () => {
      const userA = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
      });
      const startingPoints = await userPointsService.findOrThrow(userA.id);
      expect(startingPoints.pool4_count).toBe(0);
      expect(startingPoints.pool4_points).toBe(0);
      expect(startingPoints.pool4_last_occurred_at).toBeNull();

      // add points
      const latestDateMint = new Date(2023, 1, 2);
      const latestDateBurn = new Date(2023, 1, 3);
      await eventsService.create({
        userId: userA.id,
        points: 1,
        type: EventType.MULTI_ASSET_MINT,
        occurredAt: latestDateMint,
      });
      await eventsService.create({
        userId: userA.id,
        points: 1,
        type: EventType.MULTI_ASSET_BURN,
        occurredAt: latestDateBurn,
      });

      // refresh points
      await userPointsJobsController.refreshPool4Points({
        userId: userA.id,
        endDate: new Date(2023, 3, 1),
      });

      // check that points were refreshed
      const endingPoints = await userPointsService.findOrThrow(userA.id);
      expect(endingPoints.pool4_count).toBe(2);
      expect(endingPoints.pool4_points).toBe(2);
      expect(endingPoints.pool4_last_occurred_at).toEqual(latestDateBurn);
    });

    it('does not requeue', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode('alpha-3'),
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
});
