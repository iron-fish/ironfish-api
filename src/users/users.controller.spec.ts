/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { standardizeEmail } from '../common/utils/email';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from './users.service';

const API_KEY = 'test';

describe('UsersController', () => {
  let app: INestApplication;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    usersService = app.get(UsersService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
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

        expect(body).toMatchObject({
          id: expect.any(Number),
          email: standardizeEmail(email),
          created_at: expect.any(String),
          graffiti,
          discord,
        });
      });
    });
  });

  describe('POST /users/:id/token', () => {
    describe('without api token', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/users/0/token')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with invalid user id', () => {
      it('returns a 404', async () => {
        const { body } = await request(app.getHttpServer())
          .post(`/users/0/token`)
          .set('Authorization', 'Bearer test')
          .expect(HttpStatus.NOT_FOUND);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid payload', () => {
      it('create auth token', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const { body } = await request(app.getHttpServer())
          .post(`/users/${user.id}/token`)
          .set('Authorization', 'Bearer test')
          .expect(HttpStatus.CREATED);

        expect(body.email).toEqual(user.email);

        const url: string = body.url;
        expect(url.substring(0, 35)).toBe(
          'https://api.ironfish.network/login?',
        );
      });
    });
  });
});
