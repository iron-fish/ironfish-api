/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { EventType } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { NodeUptimesJobsController } from './node-uptimes.jobs.controller';
import { NodeUptimesService } from './node-uptimes.service';

describe('NodeUptimesJobsController', () => {
  let app: INestApplication;
  let eventsService: EventsService;
  let nodeUptimesJobsController: NodeUptimesJobsController;
  let nodeUptimesService: NodeUptimesService;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    eventsService = app.get(EventsService);
    nodeUptimesJobsController = app.get(NodeUptimesJobsController);
    nodeUptimesService = app.get(NodeUptimesService);
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

  describe('createNodeUptimeEvent', () => {
    it('does not update with a missing user', async () => {
      const prismaMock = jest
        .spyOn(prisma, '$transaction')
        .mockImplementationOnce(jest.fn());
      await nodeUptimesJobsController.createNodeUptimeEvent({ userId: 99999 });

      expect(prismaMock).toHaveBeenCalledTimes(0);
      prismaMock.mockRestore();
    });

    it('does not update if event creation fails', async () => {
      const eventsMock = jest
        .spyOn(eventsService, 'createNodeUptimeEventWithClient')
        .mockImplementationOnce(jest.fn());

      const user = await setupUser();

      await expect(
        nodeUptimesJobsController.createNodeUptimeEvent({
          userId: user.id,
        }),
      ).rejects.toThrow();

      eventsMock.mockRestore();
    });

    it('does not update if decrement uptime fails', async () => {
      const nodeUptimesMock = jest
        .spyOn(nodeUptimesService, 'decrementCountedHoursWithClient')
        .mockImplementationOnce(jest.fn());

      const user = await setupUser();

      await expect(
        nodeUptimesJobsController.createNodeUptimeEvent({
          userId: user.id,
        }),
      ).rejects.toThrow();

      nodeUptimesMock.mockRestore();
    });

    it('creates event and decrements hours', async () => {
      const user = await setupUser();
      await prisma.nodeUptime.create({
        data: {
          user_id: user.id,
          total_hours: 12,
        },
      });

      await nodeUptimesJobsController.createNodeUptimeEvent({
        userId: user.id,
      });

      const event = await prisma.event.findFirst({
        where: {
          user_id: user.id,
          type: EventType.NODE_UPTIME,
        },
      });
      const uptime = await prisma.nodeUptime.findUnique({
        where: {
          user_id: user.id,
        },
      });
      expect(event).not.toBeNull();
      expect(uptime).not.toBeNull();
      assert(uptime);
      expect(uptime.total_hours).toBe(0);
    });
  });
});
