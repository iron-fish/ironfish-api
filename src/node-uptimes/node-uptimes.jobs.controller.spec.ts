/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { NodeUptimesJobsController } from './node-uptimes.jobs.controller';
import { NodeUptimesLoader } from './node-uptimes-loader';

describe('NodeUptimesJobsController', () => {
  let app: INestApplication;
  let nodeUptimesJobsController: NodeUptimesJobsController;
  let nodeUptimesLoader: NodeUptimesLoader;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    nodeUptimesJobsController = app.get(NodeUptimesJobsController);
    nodeUptimesLoader = app.get(NodeUptimesLoader);
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
    describe('with a missing user', () => {
      it('does not update', async () => {
        const createEvent = jest.spyOn(
          nodeUptimesLoader,
          'incrementUptimeAndCreateEvent',
        );

        await nodeUptimesJobsController.createNodeUptimeEvent({
          userId: 99999,
          occurredAt: new Date(),
        });
        expect(createEvent).not.toHaveBeenCalled();
      });
    });

    describe('with a valid user', () => {
      it('creates an event with the loader', async () => {
        const createEvent = jest.spyOn(
          nodeUptimesLoader,
          'incrementUptimeAndCreateEvent',
        );
        const user = await setupUser();
        const occurredAt = new Date();

        await nodeUptimesJobsController.createNodeUptimeEvent({
          userId: user.id,
          occurredAt,
        });
        expect(createEvent).toHaveBeenCalledTimes(1);
        expect(createEvent).toHaveBeenCalledWith(user, occurredAt);
      });
    });
  });
});
