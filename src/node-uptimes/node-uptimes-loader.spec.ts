/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { NODE_UPTIME_CREDIT_HOURS } from '../common/constants';
import { EventsService } from '../events/events.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { NodeUptimesService } from './node-uptimes.service';
import { NodeUptimesLoader } from './node-uptimes-loader';

describe('NodeUptimesLoader', () => {
  let app: INestApplication;
  let eventsService: EventsService;
  let nodeUptimesLoader: NodeUptimesLoader;
  let nodeUptimesService: NodeUptimesService;
  let graphileWorkerService: GraphileWorkerService;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    eventsService = app.get(EventsService);
    nodeUptimesLoader = app.get(NodeUptimesLoader);
    nodeUptimesService = app.get(NodeUptimesService);
    graphileWorkerService = app.get(GraphileWorkerService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const setupUser = async () => {
    return usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      country_code: faker.address.countryCode(),
    });
  };

  describe('createEvent', () => {
    describe('with no uptime', () => {
      it('does nothing', async () => {
        const createNodeUptimeEventWithClient = jest.spyOn(
          eventsService,
          'createNodeUptimeEventWithClient',
        );
        const decrementCountedHoursWithClient = jest.spyOn(
          nodeUptimesService,
          'decrementCountedHoursWithClient',
        );
        const user = await setupUser();

        await nodeUptimesLoader.createEvents([
          { user, occurredAt: new Date() },
        ]);
        expect(createNodeUptimeEventWithClient).not.toHaveBeenCalled();
        expect(decrementCountedHoursWithClient).not.toHaveBeenCalled();
      });
    });

    describe('when the uptime does not have enough hours', () => {
      it('does nothing', async () => {
        const createNodeUptimeEventWithClient = jest.spyOn(
          eventsService,
          'createNodeUptimeEventWithClient',
        );
        const decrementCountedHoursWithClient = jest.spyOn(
          nodeUptimesService,
          'decrementCountedHoursWithClient',
        );
        const user = await setupUser();
        await prisma.nodeUptime.create({
          data: {
            user_id: user.id,
            total_hours: NODE_UPTIME_CREDIT_HOURS - 1,
          },
        });

        await nodeUptimesLoader.createEvents([
          { user, occurredAt: new Date() },
        ]);
        expect(createNodeUptimeEventWithClient).not.toHaveBeenCalled();
        expect(decrementCountedHoursWithClient).not.toHaveBeenCalled();
      });
    });

    describe('when the uptime has enough hours', () => {
      it('creates event and decrements hours', async () => {
        const createNodeUptimeEventWithClient = jest.spyOn(
          eventsService,
          'createNodeUptimeEventWithClient',
        );
        const decrementCountedHoursWithClient = jest
          .spyOn(nodeUptimesService, 'decrementCountedHoursWithClient')
          .mockImplementationOnce(jest.fn());
        const user = await setupUser();
        const uptime = await prisma.nodeUptime.create({
          data: {
            user_id: user.id,
            total_hours: NODE_UPTIME_CREDIT_HOURS,
          },
        });
        const occurredAt = new Date();

        await nodeUptimesLoader.createEvents([{ user, occurredAt }]);
        expect(createNodeUptimeEventWithClient).toHaveBeenCalledTimes(1);
        expect(createNodeUptimeEventWithClient).toHaveBeenCalledWith(
          user,
          occurredAt,
          expect.anything(),
        );
        expect(decrementCountedHoursWithClient).toHaveBeenCalledTimes(1);
        expect(decrementCountedHoursWithClient).toHaveBeenLastCalledWith(
          uptime,
          expect.anything(),
        );
      });
    });
    describe('when multiple jobs are added', () => {
      it('updates job rather than creating new job', async () => {
        const queueName = 'update_node_uptime';
        const addJob = async (userId: number) => {
          const now = new Date();
          const payload = [{ userId: userId, occurredAt: now }];
          await graphileWorkerService.addJob(
            GraphileWorkerPattern.CREATE_NODE_UPTIME_EVENT,
            payload,
            {
              queueName: queueName,
              jobKey: 'update_node_uptime',
              jobKeyMode: 'preserve_run_at',
            },
          );
        };
        await addJob(1);
        let jobs = await graphileWorkerService.getJobs(queueName);
        expect(jobs).toHaveLength(1);
        expect(jobs[0].payload).toHaveLength(1);
        await addJob(2);
        jobs = await graphileWorkerService.getJobs(queueName);
        expect(jobs).toHaveLength(1);
        expect(jobs[0].payload).toHaveLength(2);
      });
    });
  });
});
