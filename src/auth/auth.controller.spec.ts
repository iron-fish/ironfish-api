/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import jwt, { SignOptions } from 'jsonwebtoken';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let magicLinkService: MagicLinkService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    magicLinkService = app.get(MagicLinkService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /login', () => {
    describe('with no authorization header', () => {
      it('throws a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .post('/login')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with an invalid token', () => {
      it('throws a 401', async () => {
        jest
          .spyOn(magicLinkService, 'getEmailFromHeader')
          .mockImplementationOnce(() => {
            throw new Error();
          });

        const { body } = await request(app.getHttpServer())
          .post('/login')
          .set('Authorization', 'invalid-token')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with no users for the given e-mail', () => {
      it('returns a 401 back with `user_invalid`', async () => {
        jest
          .spyOn(magicLinkService, 'getEmailFromHeader')
          .mockImplementationOnce(() => Promise.resolve('iron@fish.com'));

        const { body } = await request(app.getHttpServer())
          .post('/login')
          .set('Authorization', 'missing-token')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchObject({
          error: 'user_invalid',
        });
      });
    });

    describe('with an expired jwt', () => {
      it('returns a 422 with the error', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const secret = config.get<string>('JWT_TOKEN_SECRET');
        const options: SignOptions = {
          algorithm: 'HS256',
          expiresIn: '0d',
        };

        const token = jwt.sign(
          { sub: user.email, iat: Math.floor(Date.now() / 1000) },
          secret,
          options,
        );

        const { body } = await request(app.getHttpServer())
          .get('/login')
          .query({ token })
          .expect(HttpStatus.UNPROCESSABLE_ENTITY);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid jwt token query parameter', () => {
      it('updates the last login for a user', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const secret = config.get<string>('JWT_TOKEN_SECRET');
        const options: SignOptions = {
          algorithm: 'HS256',
          expiresIn: '1d',
        };

        const token = jwt.sign(
          { sub: user.email, iat: Math.floor(Date.now() / 1000) },
          secret,
          options,
        );

        const updateLastLoginAt = jest.spyOn(usersService, 'updateLastLoginAt');

        await request(app.getHttpServer())
          .get('/login')
          .query({ token })
          .expect(HttpStatus.OK);

        expect(updateLastLoginAt).toHaveBeenCalledTimes(1);
      });
    });

    describe('with a valid token header', () => {
      it('updates the last login for a user', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const updateLastLoginAt = jest.spyOn(usersService, 'updateLastLoginAt');
        jest
          .spyOn(magicLinkService, 'getEmailFromHeader')
          .mockImplementationOnce(() => Promise.resolve(user.email));

        await request(app.getHttpServer())
          .post('/login')
          .set('Authorization', 'valid-token')
          .expect(HttpStatus.OK);

        expect(updateLastLoginAt).toHaveBeenCalledTimes(1);
      });
    });
  });
});
