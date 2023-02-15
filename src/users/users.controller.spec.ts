/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { EventType } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { MetricsGranularity } from '../common/enums/metrics-granularity';
import { standardizeEmail } from '../common/utils/email';
import { EventsJobsController } from '../events/events.jobs.controller';
import { EventsService } from '../events/events.service';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { RecaptchaVerificationService } from '../recaptcha-verification/recaptcha-verification.service';
import { bootstrapTestApp } from '../test/test-app';
import { UpsertUserPointsOptions } from '../user-points/interfaces/upsert-user-points-options';
import { UserPointsJobsController } from '../user-points/user-points.jobs.controller';
import { UserPointsService } from '../user-points/user-points.service';
import { UserRanksService } from '../user-rank/user-ranks.service';
import { UsersService } from './users.service';

const API_KEY = 'test';

describe('UsersController', () => {
  let app: INestApplication;
  let magicLinkService: MagicLinkService;
  let usersService: UsersService;
  let eventsService: EventsService;
  let eventsJobsController: EventsJobsController;
  let userPointsJobsController: UserPointsJobsController;
  let userRankService: UserRanksService;
  let recaptchaVerificationService: RecaptchaVerificationService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    magicLinkService = app.get(MagicLinkService);
    usersService = app.get(UsersService);
    eventsService = app.get(EventsService);
    eventsJobsController = app.get(EventsJobsController);
    userPointsJobsController = app.get(UserPointsJobsController);
    userRankService = app.get(UserRanksService);
    recaptchaVerificationService = app.get(RecaptchaVerificationService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/:id', () => {
    it('returns the user by id', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode(),
      });

      const { body } = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        id: user.id,
        graffiti: user.graffiti,
        total_points: expect.any(Number),
        created_at: user.created_at.toISOString(),
      });
    });

    it('returns a 404 if no id found', async () => {
      await request(app.getHttpServer())
        .get('/users/0')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /users/find', () => {
    it('returns the user by graffiti', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode(),
      });

      const { body } = await request(app.getHttpServer())
        .get(`/users/find`)
        .query({ graffiti: user.graffiti })
        .expect(HttpStatus.OK);

      expect(body).not.toHaveProperty('rank');
      expect(body).toMatchObject({
        id: user.id,
        graffiti: user.graffiti,
        verified: false,
        node_uptime_count: 0,
        node_uptime_threshold: 14,
        total_points: expect.any(Number),
        created_at: user.created_at.toISOString(),
      });
    });

    it('gives proper answer for verified', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode(),
      });
      await usersService.updateLastLoginAt(user);

      const { body } = await request(app.getHttpServer())
        .get(`/users/find`)
        .query({ graffiti: user.graffiti })
        .expect(HttpStatus.OK);

      expect(body).not.toHaveProperty('rank');
      expect(body).toMatchObject({
        id: user.id,
        graffiti: user.graffiti,
        verified: true,
        total_points: expect.any(Number),
        created_at: user.created_at.toISOString(),
      });
    });

    it('gives proper answer for node_uptime_count', async () => {
      const userPointsService = app.get(UserPointsService);
      const expectedPoints = 5;

      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: faker.address.countryCode(),
      });

      const points = {
        [EventType.NODE_UPTIME]: {
          points: 150,
          count: expectedPoints,
          latestOccurredAt: new Date(),
        },
      };

      const options: UpsertUserPointsOptions = {
        userId: user.id,
        points: points,
      };

      await userPointsService.upsert(options);

      const { body } = await request(app.getHttpServer())
        .get(`/users/find`)
        .query({ graffiti: user.graffiti })
        .expect(HttpStatus.OK);

      expect(body).not.toHaveProperty('rank');
      expect(body).toMatchObject({
        id: user.id,
        graffiti: user.graffiti,
        node_uptime_count: expectedPoints,
        total_points: expect.any(Number),
        created_at: user.created_at.toISOString(),
      });
    });

    it('returns a 404 for nonexistent user', async () => {
      await request(app.getHttpServer())
        .get(`/users/find?graffiti=${uuid()}`)
        .expect(HttpStatus.NOT_FOUND);
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

    describe('with invalid granularity', () => {
      it('returns a 422', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/users/123/metrics')
          .query({ granularity: MetricsGranularity.DAY })
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
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const { body } = await request(app.getHttpServer())
          .get(`/users/${user.id}/metrics`)
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
          .get('/users/123456789/metrics')
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
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        await eventsService.create({
          userId: user.id,
          type: EventType.BUG_CAUGHT,
          points: 100,
        });

        await eventsService.create({
          userId: user.id,
          type: EventType.PULL_REQUEST_MERGED,
          points: 500,
        });

        await eventsJobsController.updateLatestPoints({
          userId: user.id,
          type: EventType.PULL_REQUEST_MERGED,
        });
        await eventsJobsController.updateLatestPoints({
          userId: user.id,
          type: EventType.BUG_CAUGHT,
        });
        // refresh points
        await userPointsJobsController.refreshPool4Points({
          userId: user.id,
          endDate: new Date(2024, 3, 1),
        });
        await userRankService.updateRanks();

        const { body } = await request(app.getHttpServer())
          .get(`/users/${user.id}/metrics`)
          .query({
            granularity: MetricsGranularity.LIFETIME,
          });

        expect(body).toMatchObject({
          user_id: user.id,
          granularity: MetricsGranularity.LIFETIME,
          points: expect.any(Number),
          node_uptime: {
            total_hours: 0,
            last_checked_in: null,
          },
          pools: {
            main: {
              rank: expect.any(Number),
              count: expect.any(Number),
              points: 100,
            },
            code: {
              rank: expect.any(Number),
              count: expect.any(Number),
              points: 500,
            },
          },
          metrics: {
            blocks_mined: {
              count: 0,
              points: 0,
            },
            bugs_caught: {
              count: 1,
              points: 100,
            },
            community_contributions: {
              count: 0,
              points: 0,
            },
            pull_requests_merged: {
              count: 1,
              points: 500,
            },
            social_media_contributions: {
              count: 0,
              points: 0,
            },
            node_uptime: {
              count: 0,
              points: 0,
            },
            send_transaction: {
              count: 0,
              points: 0,
            },
          },
        });
      });
      it('returns null for user without any points', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });
        const { body } = await request(app.getHttpServer())
          .get(`/users/${user.id}/metrics`)
          .query({
            granularity: MetricsGranularity.LIFETIME,
          });

        expect(body).toMatchObject({
          user_id: user.id,
          granularity: MetricsGranularity.LIFETIME,
          points: 0,
          pools: {
            main: {
              rank: null,
              count: null,
              points: null,
            },
            code: {
              rank: null,
              count: null,
              points: null,
            },
          },
        });
      });
    });

    describe('with a valid total request', () => {
      it('returns the total metrics for the user in the given range', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
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
          points: 0,
          metrics: {
            blocks_mined: {
              count: 0,
              points: 0,
            },
            bugs_caught: {
              count: 0,
              points: 0,
            },
            community_contributions: {
              count: 0,
              points: 0,
            },
            pull_requests_merged: {
              count: 0,
              points: 0,
            },
            social_media_contributions: {
              count: 0,
              points: 0,
            },
            node_uptime: {
              count: 0,
              points: 0,
            },
          },
        });
      });
    });
  });

  describe('GET /users', () => {
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
          created_at: expect.any(String),
        });
      });
    });

    describe('with `order_by` provided', () => {
      it('returns ranks with the users (and no country_code provided)', async () => {
        await userRankService.updateRanks();
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
          created_at: expect.any(String),
        });
      });
    });

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
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });
        await request(app.getHttpServer())
          .post(`/users`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .send({ email: user.email, graffiti: user.graffiti })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);
      });
    });

    describe('with valid arguments', () => {
      it('creates a user', async () => {
        const email = faker.internet.email().toUpperCase();
        const recaptchaVerification = jest
          .spyOn(recaptchaVerificationService, 'verify')
          .mockImplementation(() => Promise.resolve(true));

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
            recaptcha: 'token',
          })
          .expect(HttpStatus.CREATED);

        expect(recaptchaVerification).toHaveBeenCalledTimes(1);
        expect(body).toMatchObject({
          id: expect.any(Number),
          email: standardizeEmail(email),
          created_at: expect.any(String),
          graffiti,
          discord,
        });
      });

      describe('recaptcha verification failure', () => {
        afterEach(() => {
          jest.clearAllMocks();
        });

        it('returns 422 on missing recaptcha token', async () => {
          const email = faker.internet.email().toUpperCase();
          const recaptchaVerification = jest.spyOn(
            recaptchaVerificationService,
            'verify',
          );

          const graffiti = uuid();
          const discord = faker.internet.userName();
          await request(app.getHttpServer())
            .post(`/users`)
            .set('Authorization', `Bearer ${API_KEY}`)
            .send({
              email,
              graffiti,
              discord,
              country_code: faker.address.countryCode('alpha-3'),
            })
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

          expect(recaptchaVerification).toHaveBeenCalledTimes(1);
        });

        it('returns 422 on failed verification', async () => {
          const email = faker.internet.email().toUpperCase();
          const recaptchaVerification = jest
            .spyOn(recaptchaVerificationService, 'verify')
            .mockImplementation(() => Promise.resolve(false));

          const graffiti = uuid();
          const discord = faker.internet.userName();
          await request(app.getHttpServer())
            .post(`/users`)
            .set('Authorization', `Bearer ${API_KEY}`)
            .send({
              email,
              graffiti,
              discord,
              country_code: faker.address.countryCode('alpha-3'),
              recaptcha: 'token',
            })
            .expect(HttpStatus.UNPROCESSABLE_ENTITY);

          expect(recaptchaVerification).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('PUT /users/:id', () => {
    describe('with no logged in user', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .put('/users/0')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a mismatch in id', () => {
      it('returns a 403', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        jest
          .spyOn(magicLinkService, 'getEmailFromHeader')
          .mockImplementationOnce(() => Promise.resolve(user.email));

        const { body } = await request(app.getHttpServer())
          .put('/users/0')
          .set('Authorization', 'token')
          .send({ discord: 'foo' })
          .expect(HttpStatus.FORBIDDEN);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with an empty string graffiti', () => {
      it('returns a 422', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        jest
          .spyOn(magicLinkService, 'getEmailFromHeader')
          .mockImplementationOnce(() => Promise.resolve(user.email));

        const { body } = await request(app.getHttpServer())
          .put(`/users/${user.id}`)
          .set('Authorization', 'token')
          .send({
            graffiti: '',
          })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toEqual({
          error: 'Unprocessable Entity',
          message: ['graffiti should not be empty'],
          statusCode: 422,
        });
      });
    });

    describe('with a valid payload', () => {
      it('updates the user', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        jest
          .spyOn(magicLinkService, 'getEmailFromHeader')
          .mockImplementationOnce(() => Promise.resolve(user.email));

        const options = { discord: uuid() };
        const { body } = await request(app.getHttpServer())
          .put(`/users/${user.id}`)
          .set('Authorization', 'token')
          .send(options)
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: user.id,
          discord: options.discord,
        });
      });
    });
  });
});
