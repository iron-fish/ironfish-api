/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { MetricsGranularity } from './enums/metrics-granularity';

const API_KEY = 'test';

describe('UsersController', () => {
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

  describe('GET /users/:id', () => {
    describe('with a valid id', () => {
      it('returns the user', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
          },
        });
        const { body } = await request(app.getHttpServer())
          .get(`/users/${user.id}`)
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: user.id,
          email: user.email,
          graffiti: user.graffiti,
        });
      });
    });

    describe('with a missing id', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .get('/users/12345')
          .expect(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('GET /users/:id/metrics', () => {
    describe('with start but no end', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/users/123/metrics')
          .query({
            start: new Date().toISOString(),
            granularity: MetricsGranularity.TOTAL,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with end but no start', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/users/123/metrics')
          .query({
            end: new Date().toISOString(),
            granularity: MetricsGranularity.TOTAL,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing granularity', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/users/123/metrics')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a time range for a LIFETIME request', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/users/123/metrics')
          .query({
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            granularity: MetricsGranularity.LIFETIME,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with start after end', () => {
      it('returns a 422', async () => {
        const start = new Date().toISOString();
        const end = new Date(Date.now() - 1).toISOString();
        const { body } = await request(app.getHttpServer())
          .get('/users/123/metrics')
          .query({
            start,
            end,
            granularity: MetricsGranularity.TOTAL,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a time range longer than the supported range', () => {
      it('returns a 422', async () => {
        const start = '2021-06-01T00:00:00.000Z';
        const end = '2021-08-01T00:00:00.000Z';
        const { body } = await request(app.getHttpServer())
          .get('/users/123/metrics')
          .query({
            start,
            end,
            granularity: MetricsGranularity.TOTAL,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a TOTAL request and no time range', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/users/123/metrics')
          .query({
            granularity: MetricsGranularity.TOTAL,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing user', () => {
      it('returns a 404', async () => {
        const start = new Date(Date.now() - 1).toISOString();
        const end = new Date().toISOString();
        await request(app.getHttpServer())
          .get('/users/12345/metrics')
          .query({
            start,
            end,
            granularity: MetricsGranularity.TOTAL,
          })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid lifetime request', () => {
      it('returns the lifetime metrics for the user', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
          },
        });
        const granularity = MetricsGranularity.LIFETIME;

        const { body } = await request(app.getHttpServer())
          .get(`/users/${user.id}/metrics`)
          .query({
            granularity,
          });
        expect(body).toMatchObject({
          user_id: user.id,
          granularity,
          points: expect.any(Number),
          metrics: {
            blocks_mined: expect.any(Number),
            bugs_caught: expect.any(Number),
            community_contributions: expect.any(Number),
            nodes_hosted: expect.any(Number),
            pull_requests_merged: expect.any(Number),
            social_media_contributions: expect.any(Number),
          },
        });
      });
    });

    describe('with a valid total request', () => {
      it('returns the total metrics for the user in the given range', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
          },
        });
        const start = new Date(Date.now() - 1).toISOString();
        const end = new Date().toISOString();
        const granularity = MetricsGranularity.TOTAL;

        const { body } = await request(app.getHttpServer())
          .get(`/users/${user.id}/metrics`)
          .query({
            granularity,
            start,
            end,
          });
        expect(body).toMatchObject({
          user_id: user.id,
          granularity,
          points: expect.any(Number),
          metrics: {
            blocks_mined: expect.any(Number),
            bugs_caught: expect.any(Number),
            community_contributions: expect.any(Number),
            nodes_hosted: expect.any(Number),
            pull_requests_merged: expect.any(Number),
            social_media_contributions: expect.any(Number),
          },
        });
      });
    });
  });

  describe('GET /users', () => {
    describe('with an invalid order by option', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/users')
          .query({
            order_by: 'foobar',
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid request', () => {
      it('returns a list of users', async () => {
        const { body } = await request(app.getHttpServer())
          .get(`/users`)
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          email: expect.any(String),
          graffiti: expect.any(String),
        });
      });
    });
  });

  describe('POST /users', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

    describe('with a missing API key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/users`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/users`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a duplicate email', () => {
      it('returns a 422', async () => {
        const user = await prisma.user.create({
          data: {
            email: faker.internet.email(),
            graffiti: uuid(),
          },
        });
        await request(app.getHttpServer())
          .post(`/users`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ email: user.email, graffiti: user.graffiti })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);
      });
    });

    describe('with valid arguments', () => {
      it('creates an user', async () => {
        const email = faker.internet.email();
        const graffiti = uuid();
        const { body } = await request(app.getHttpServer())
          .post(`/users`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ email, graffiti })
          .expect(HttpStatus.CREATED);

        expect(body).toMatchObject({
          id: expect.any(Number),
          email,
          graffiti,
        });
      });
    });
  });
});
