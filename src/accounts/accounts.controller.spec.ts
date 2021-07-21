/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { MetricsGranularity } from './enums/metrics-granularity';

const API_KEY = 'test';

describe('AccountsController', () => {
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

  describe('GET /accounts/:id', () => {
    describe('with a valid id', () => {
      it('returns the account', async () => {
        const account = await prisma.account.create({
          data: {
            public_address: uuid(),
          },
        });
        const { body } = await request(app.getHttpServer())
          .get(`/accounts/${account.id}`)
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: account.id,
          public_address: account.public_address,
        });
      });
    });

    describe('with a missing id', () => {
      it('returns a 404', async () => {
        await request(app.getHttpServer())
          .get('/accounts/12345')
          .expect(HttpStatus.NOT_FOUND);
      });
    });
  });

  describe('GET /accounts/:id/metrics', () => {
    describe('with start but no end', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/accounts/123/metrics')
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
          .get('/accounts/123/metrics')
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
          .get('/accounts/123/metrics')
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a time range for a LIFETIME request', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/accounts/123/metrics')
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
          .get('/accounts/123/metrics')
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
          .get('/accounts/123/metrics')
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
          .get('/accounts/123/metrics')
          .query({
            granularity: MetricsGranularity.TOTAL,
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a missing account', () => {
      it('returns a 404', async () => {
        const start = new Date(Date.now() - 1).toISOString();
        const end = new Date().toISOString();
        await request(app.getHttpServer())
          .get('/accounts/12345/metrics')
          .query({
            start,
            end,
            granularity: MetricsGranularity.TOTAL,
          })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('with a valid lifetime request', () => {
      it('returns the lifetime metrics for the account', async () => {
        const account = await prisma.account.create({
          data: {
            public_address: uuid(),
          },
        });
        const granularity = MetricsGranularity.LIFETIME;

        const { body } = await request(app.getHttpServer())
          .get(`/accounts/${account.id}/metrics`)
          .query({
            granularity,
          });
        expect(body).toMatchObject({
          account_id: account.id,
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
      it('returns the total metrics for the account in the given range', async () => {
        const account = await prisma.account.create({
          data: {
            public_address: uuid(),
          },
        });
        const start = new Date(Date.now() - 1).toISOString();
        const end = new Date().toISOString();
        const granularity = MetricsGranularity.TOTAL;

        const { body } = await request(app.getHttpServer())
          .get(`/accounts/${account.id}/metrics`)
          .query({
            granularity,
            start,
            end,
          });
        expect(body).toMatchObject({
          account_id: account.id,
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

  describe('GET /accounts', () => {
    describe('with an invalid order by option', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/accounts')
          .query({
            order_by: 'foobar',
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid request', () => {
      it('returns a list of accounts', async () => {
        const { body } = await request(app.getHttpServer())
          .get(`/accounts`)
          .expect(HttpStatus.OK);

        const { data } = body;
        expect((data as unknown[]).length).toBeGreaterThan(0);
        expect((data as unknown[])[0]).toMatchObject({
          id: expect.any(Number),
          public_address: expect.any(String),
        });
      });
    });
  });

  describe('POST /accounts', () => {
    beforeEach(() => {
      jest.spyOn(config, 'get').mockImplementationOnce(() => API_KEY);
    });

    describe('with a missing API key', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/accounts`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with missing arguments', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/accounts`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with valid arguments', () => {
      it('creates an account', async () => {
        const publicAddress = 'foo-bar-baz';
        const { body } = await request(app.getHttpServer())
          .post(`/accounts`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ public_address: publicAddress })
          .expect(HttpStatus.CREATED);

        expect(body).toMatchObject({
          id: expect.any(Number),
          public_address: publicAddress,
        });
      });
    });
  });
});
