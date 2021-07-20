/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { EventType } from '.prisma/client';

const API_KEY = 'test';

describe('EventsController', () => {
  let app: INestApplication;
  let config: ConfigService;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ConfigService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /events/', () => {
    describe('with no filters', () => {
      it('returns a list of events', async () => {
        const { body } = await request(app.getHttpServer())
          .get(`/events`)
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          account_id: expect.any(Number),
          type: expect.any(String),
        });
      });
    });

    describe('with an account filter', () => {
      it('returns events only for that account', async () => {
        const account = await prisma.account.create({
          data: {
            public_address: uuid(),
          },
        });
        const firstEvent = await prisma.event.create({
          data: {
            type: EventType.BUG_CAUGHT,
            account_id: account.id,
            occurred_at: new Date(),
            points: 0,
          },
        });
        const secondEvent = await prisma.event.create({
          data: {
            type: EventType.COMMUNITY_CONTRIBUTION,
            account_id: account.id,
            occurred_at: new Date(),
            points: 0,
          },
        });
        const thirdEvent = await prisma.event.create({
          data: {
            type: EventType.SOCIAL_MEDIA_PROMOTION,
            account_id: account.id,
            occurred_at: new Date(),
            points: 0,
          },
        });
        const events = [firstEvent, secondEvent, thirdEvent];

        const { body } = await request(app.getHttpServer())
          .get(`/events`)
          .query({ account_id: account.id })
          .expect(HttpStatus.OK);

        const { data } = body;
        expect(data).toHaveLength(events.length);
        for (const event of data) {
          expect(event).toMatchObject({
            id: expect.any(Number),
            account_id: account.id,
            type: expect.any(String),
          });
        }
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

    describe('with a missing account id', () => {
      it('returns a 404', async () => {
        const type = EventType.BUG_CAUGHT;
        const points = 10;
        const { body } = await request(app.getHttpServer())
          .post(`/events`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ account_id: 12345, type, points })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid payload', () => {
      it('creates an event record', async () => {
        const account = await prisma.account.create({
          data: {
            public_address: uuid(),
          },
        });
        const type = EventType.BUG_CAUGHT;
        const points = 10;
        const { body } = await request(app.getHttpServer())
          .post(`/events`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ account_id: account.id, type, points })
          .expect(HttpStatus.CREATED);

        expect(body).toMatchObject({
          id: expect.any(Number),
          account_id: account.id,
          type,
          points,
        });
      });
    });
  });
});
