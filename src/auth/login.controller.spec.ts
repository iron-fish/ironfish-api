/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { ulid } from 'ulid';
import { v4 as uuid } from 'uuid';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';

describe('LoginController', () => {
  let app: INestApplication;
  let magicLinkService: MagicLinkService;
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    magicLinkService = app.get(MagicLinkService);
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
        jest.spyOn(magicLinkService, 'validate').mockImplementationOnce(() => {
          throw new Error('Invalid token');
        });
        const { body } = await request(app.getHttpServer())
          .post('/login')
          .set('Authorization', 'invalid-token')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with no email for the token', () => {
      it('throws a 401', async () => {
        jest
          .spyOn(magicLinkService, 'validate')
          .mockImplementationOnce(jest.fn());
        jest
          .spyOn(magicLinkService, 'getMetadataByHeader')
          .mockImplementationOnce(async () =>
            Promise.resolve({
              issuer: null,
              email: null,
              publicAddress: null,
            }),
          );

        const { body } = await request(app.getHttpServer())
          .post('/login')
          .set('Authorization', 'valid-token')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a valid token', () => {
      it('updates the last login for a user', async () => {
        const user = await prisma.user.create({
          data: {
            confirmation_token: ulid(),
            email: faker.internet.email(),
            graffiti: uuid(),
            country_code: faker.address.countryCode('alpha-3'),
            confirmed_at: new Date().toISOString(),
          },
        });

        const updateLastLoginAt = jest.spyOn(usersService, 'updateLastLoginAt');
        jest
          .spyOn(magicLinkService, 'validate')
          .mockImplementationOnce(jest.fn());
        jest
          .spyOn(magicLinkService, 'getMetadataByHeader')
          .mockImplementationOnce(async () =>
            Promise.resolve({
              issuer: null,
              email: user.email,
              publicAddress: null,
            }),
          );

        await request(app.getHttpServer())
          .post('/login')
          .set('Authorization', 'valid-token')
          .expect(HttpStatus.OK);

        expect(updateLastLoginAt).toHaveBeenCalledTimes(1);
      });
    });
  });
});
