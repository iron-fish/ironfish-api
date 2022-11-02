/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { EventType } from '.prisma/client';

const API_KEY = 'test';

describe('EventsController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let graphileWorkerService: GraphileWorkerService;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    graphileWorkerService = app.get(GraphileWorkerService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /events/', () => {
    describe('with a user filter', () => {
      it('returns events only for that user', async () => {
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

        const { body } = await request(app.getHttpServer())
          .get(`/events`)
          .query({ user_id: user.id })
          .expect(HttpStatus.OK);

        const { data } = body;
        expect(data).toHaveLength(events.length);
        for (const event of data) {
          expect(event).toMatchObject({
            id: expect.any(Number),
            user_id: user.id,
            type: expect.any(String),
            metadata: expect.any(Object),
          });
        }
      });
    });

    describe('with no filters', () => {
      it('returns a list of events', async () => {
        const { body } = await request(app.getHttpServer())
          .get(`/events`)
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          user_id: expect.any(Number),
          type: expect.any(String),
          metadata: expect.any(Object),
        });
      });
    });
  });

  describe('POST /events', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/events`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/events`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing user id', () => {
      it('returns a 404', async () => {
        const type = EventType.BUG_CAUGHT;
        const points = 10;
        const { body } = await request(app.getHttpServer())
          .post(`/events`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ graffiti: uuid(), type, points })
          .expect(HttpStatus.NOT_FOUND);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid payload', () => {
      it('enqueues a worker job to create the event', async () => {
        const addJob = jest
          .spyOn(graphileWorkerService, 'addJob')
          .mockImplementationOnce(jest.fn());

        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        const occurredAt = new Date();
        const type = EventType.BUG_CAUGHT;
        const points = 10;
        await request(app.getHttpServer())
          .post('/events')
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({
            graffiti: user.graffiti,
            type,
            points,
            occurred_at: occurredAt.toISOString(),
          })
          .expect(HttpStatus.ACCEPTED);

        expect(addJob).toHaveBeenCalledWith(
          GraphileWorkerPattern.CREATE_EVENT,
          {
            type,
            points,
            occurredAt,
            userId: user.id,
            url: undefined,
          },
        );
      });
    });
  });

  describe('DELETE /events', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

    describe('with a missing api key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .delete(`/events/123`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing event id', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .delete(`/events/12345`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid event id', () => {
      it('returns a 204', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        const event = await prisma.event.create({
          data: {
            type: EventType.BUG_CAUGHT,
            user_id: user.id,
            occurred_at: new Date(),
            points: 0,
          },
        });

        await request(app.getHttpServer())
          .delete(`/events/${event.id}`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.NO_CONTENT);
      });
    });
  });
});
