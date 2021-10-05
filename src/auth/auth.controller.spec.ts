/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { ulid } from 'ulid';
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
          .set('Authorization', 'valid-token')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid token', () => {
      it('updates the last login for a user', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        await usersService.confirm(user);

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

  describe('GET /auth/callback', () => {
    describe('with an error fetching the email from Magic Link', () => {
      it('redirects back with `user_invalid`', async () => {
        jest
          .spyOn(magicLinkService, 'getEmailFromToken')
          .mockImplementationOnce(() => {
            throw new Error();
          });

        const { header } = await request(app.getHttpServer())
          .get('/auth/callback?magic_credential=yeet')
          .expect(HttpStatus.FOUND);

        expect((header as Record<string, unknown>).location).toBe(
          `${config.get<string>(
            'INCENTIVIZED_TESTNET_URL',
          )}/callback?error=user_invalid`,
        );
      });
    });

    describe('with no users for the given e-mail', () => {
      it('redirects back with `user_invalid`', async () => {
        jest
          .spyOn(magicLinkService, 'getEmailFromToken')
          .mockImplementationOnce(() => Promise.resolve('iron@fish.com'));

        const { header } = await request(app.getHttpServer())
          .get('/auth/callback?magic_credential=yeet')
          .expect(HttpStatus.FOUND);

        expect((header as Record<string, unknown>).location).toBe(
          `${config.get<string>(
            'INCENTIVIZED_TESTNET_URL',
          )}/callback?error=user_invalid`,
        );
      });
    });

    describe('with an unconfirmed user for the given e-mail', () => {
      it('redirects back with `user_unconfirmed`', async () => {
        const email = 'iron@fish.com';
        jest
          .spyOn(magicLinkService, 'getEmailFromToken')
          .mockImplementationOnce(() => Promise.resolve(email));
        jest.spyOn(usersService, 'listByEmail').mockResolvedValueOnce([
          {
            id: 0,
            created_at: new Date(),
            updated_at: new Date(),
            email,
            graffiti: ulid(),
            total_points: 0,
            country_code: faker.address.countryCode('alpha-3'),
            email_notifications: false,
            last_login_at: null,
            discord: null,
            telegram: ulid(),
            confirmation_token: ulid(),
            confirmed_at: new Date(),
          },
        ]);

        const { header } = await request(app.getHttpServer())
          .get('/auth/callback?magic_credential=yeet')
          .expect(HttpStatus.FOUND);

        expect((header as Record<string, unknown>).location).toBe(
          `${config.get<string>(
            'INCENTIVIZED_TESTNET_URL',
          )}/callback?error=user_unconfirmed`,
        );
      });
    });

    describe('with a confirmed user', () => {
      it('updates the last login timestamp', async () => {
        const magicCredential = 'yeet';
        const email = faker.internet.email();
        const user = await usersService.create({
          email,
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        await usersService.confirm(user);

        jest
          .spyOn(magicLinkService, 'getEmailFromToken')
          .mockImplementationOnce(() => Promise.resolve(email));

        const { header } = await request(app.getHttpServer())
          .get(`/auth/callback?magic_credential=${magicCredential}`)
          .expect(HttpStatus.FOUND);

        expect((header as Record<string, unknown>).location).toBe(
          `${config.get<string>(
            'INCENTIVIZED_TESTNET_URL',
          )}/callback?magic_credential=${magicCredential}`,
        );
      });

      it('redirects back with the `magic_credential`', async () => {
        const magicCredential = 'yeet';
        const email = faker.internet.email();
        const user = await usersService.create({
          email,
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        await usersService.confirm(user);

        jest
          .spyOn(magicLinkService, 'getEmailFromToken')
          .mockImplementationOnce(() => Promise.resolve(email));
        const updateLastLoginAt = jest.spyOn(usersService, 'updateLastLoginAt');

        await request(app.getHttpServer())
          .get(`/auth/callback?magic_credential=${magicCredential}`)
          .expect(HttpStatus.FOUND);

        expect(updateLastLoginAt).toHaveBeenCalledTimes(1);
        expect(updateLastLoginAt).toHaveBeenCalledWith(
          expect.objectContaining({
            id: user.id,
          }),
        );
      });
    });
  });
});
