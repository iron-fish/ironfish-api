/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { ulid } from 'ulid';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { MetricsGranularity } from './enums/metrics-granularity';

const API_KEY = 'test';

describe('UsersController', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
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
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode(),
          },
        });
        const { body } = await request(app.getHttpServer())
          .get(`/users/${user.id}`)
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: user.id,
          graffiti: user.graffiti,
          total_points: expect.any(Number),
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
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
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
            blocks_mined: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
            bugs_caught: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
            community_contributions: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
            pull_requests_merged: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
            social_media_contributions: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
          },
        });
      });
    });

    describe('with a valid total request', () => {
      it('returns the total metrics for the user in the given range', async () => {
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            confirmed_at: new Date().toISOString(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
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
            blocks_mined: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
            bugs_caught: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
            community_contributions: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
            pull_requests_merged: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
            social_media_contributions: {
              count: expect.any(Number),
              points: expect.any(Number),
            },
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
          graffiti: expect.any(String),
        });
      });
    });

    describe('with `order_by` provided', () => {
      it('returns ranks with the users (and no country_code provided)', async () => {
        const { body } = await request(app.getHttpServer())
          .get(`/users`)
          .query({ order_by: 'rank' })
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          graffiti: expect.any(String),
          rank: expect.any(Number),
        });
      });
    });
    const getLocation = async () => {
      const { body } = await request(app.getHttpServer())
        .get('/users')
        .expect(HttpStatus.OK);

      const { data } = body;
      const places = (data as Record<string, unknown>[]).map(
        ({ country_code: cc }) => cc,
      );
      return places[0] as string;
    };
    describe('with `country_code` provided', () => {
      it('allows filtering by country_code', async () => {
        const someplace = await getLocation();
        const { body } = await request(app.getHttpServer())
          .get('/users')
          .query({ country_code: someplace })
          .expect(HttpStatus.OK);
        const { data } = body;
        (data as Record<string, unknown>[]).map(({ country_code }) =>
          expect(country_code).toEqual(someplace),
        );
      });
    });

    describe('when rank is provided', () => {
      it('filters by country code', async () => {
        const someplace = await getLocation();
        const { body } = await request(app.getHttpServer())
          .get('/users')
          .query({ country_code: someplace, order_by: 'rank' })
          .expect(HttpStatus.OK);
        const { data } = body;
        (data as Record<string, unknown>[]).map(({ country_code }) =>
          expect(country_code).toEqual(someplace),
        );
      });
    });

    describe('with an invalid cursor', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .get(`/users`)
          .query({ order_by: 'rank', before: -1 })
          .expect(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('POST /users', () => {
    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/users`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with empty arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/users`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ email: '', graffiti: '' })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a duplicate email', () => {
      it('returns a 422', async () => {
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
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
        const discord = faker.internet.userName();
        const { body } = await request(app.getHttpServer())
          .post(`/users`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({
            email,
            graffiti,
            discord,
            country_code: faker.address.countryCode('alpha-3'),
          })
          .expect(HttpStatus.CREATED);
        expect(body).toMatchObject({
          id: expect.any(Number),
          email,
          graffiti,
          discord,
        });
      });
    });
  });
});
