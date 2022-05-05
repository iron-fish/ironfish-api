/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { NodeUptimesService } from './node-uptimes.service';

describe('NodeUptimesService', () => {
  let app: INestApplication;
  let nodeUptimesService: NodeUptimesService;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    nodeUptimesService = app.get(NodeUptimesService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const createUser = async () => {
    return usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      country_code: faker.address.countryCode(),
    });
  };

  describe('upsert', () => {
    it('creates node uptime if not already created', async () => {
      const now = new Date();
      const user = await createUser();

      const { uptime } = await nodeUptimesService.addUptime(user);

      expect(uptime).toMatchObject({
        user_id: user.id,
        last_checked_in: expect.any(Date),
        total_hours: 0,
      });

      expect(uptime.last_checked_in.getTime()).toBeGreaterThanOrEqual(
        now.getTime(),
      );
    });

    it('updates an existing node uptime if enough time has passed', async () => {
      const now = new Date();
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(now.getHours() - 2);
      const user = await createUser();
      await prisma.nodeUptime.create({
        data: {
          user_id: user.id,
          last_checked_in: twoHoursAgo,
          total_hours: 0,
        },
      });

      const { uptime } = await nodeUptimesService.addUptime(user);

      expect(uptime).toMatchObject({
        user_id: user.id,
        last_checked_in: expect.any(Date),
        total_hours: 1,
      });

      expect(uptime.last_checked_in.getTime()).toBeGreaterThanOrEqual(
        now.getTime(),
      );
    });

    it('does not update node uptime if enough time has not passed', async () => {
      const now = new Date();
      const user = await createUser();

      await prisma.nodeUptime.create({
        data: {
          user_id: user.id,
          last_checked_in: now,
          total_hours: 0,
        },
      });

      const { uptime, added } = await nodeUptimesService.addUptime(user);

      expect(added).toBe(false);

      expect(uptime).toMatchObject({
        user_id: user.id,
        last_checked_in: now,
        total_hours: 0,
      });
    });
  });

  describe('get', () => {
    it('returns null if not created', async () => {
      const user = await createUser();

      const result = await nodeUptimesService.get(user);

      expect(result).toBeNull();
    });

    it('returns node uptime if created', async () => {
      const user = await createUser();

      const uptime = await prisma.nodeUptime.create({
        data: {
          user_id: user.id,
        },
      });

      const result = await nodeUptimesService.get(user);

      expect(result).toEqual(uptime);
    });
  });

  describe('decrementCountedHoursWithClient', () => {
    it('decrements total hours count', async () => {
      const user = await createUser();

      await prisma.nodeUptime.create({
        data: {
          user_id: user.id,
          total_hours: 12,
        },
      });

      const result = await nodeUptimesService.decrementCountedHoursWithClient(
        user,
        prisma,
      );

      assert(result);
      expect(result.total_hours).toBe(0);
    });
  });
});
