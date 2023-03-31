/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import cookie from 'cookie';
import faker from 'faker';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from './users.service';

describe('MeController', () => {
  let app: INestApplication;
  let magicLinkService: MagicLinkService;
  let usersService: UsersService;

  beforeEach(async () => {
    app = await bootstrapTestApp();
    magicLinkService = app.get(MagicLinkService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /me', () => {
    describe('with no logged in user', () => {
      it('returns a 401', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/me')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('with a logged in user', () => {
      it('returns the user', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        jest
          .spyOn(magicLinkService, 'getEmailFromHeader')
          .mockImplementationOnce(() => Promise.resolve(user.email));

        const { body } = await request(app.getHttpServer())
          .get('/me')
          .set('Authorization', 'did-token')
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: user.id,
          country_code: user.country_code,
          discord: user.discord,
          email: user.email,
          graffiti: user.graffiti,
          telegram: user.telegram,
        });
      });

      it('returns the user for jwt token', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });

        const token = jwt.sign({ sub: user.email, iat: Date.now() }, 'secret', {
          expiresIn: '1d',
        });

        const { body } = await request(app.getHttpServer())
          .get('/me')
          .set(
            'cookie',
            cookie.serialize('jwt', String(token), {
              httpOnly: true,
              maxAge: 60 * 60 * 24,
            }),
          )
          .expect(HttpStatus.OK);

        expect(body).toMatchObject({
          id: user.id,
          country_code: user.country_code,
          discord: user.discord,
          email: user.email,
          graffiti: user.graffiti,
          telegram: user.telegram,
        });
      });
    });

    describe('with a invalid user', () => {
      it('returns the error', async () => {
        jest
          .spyOn(magicLinkService, 'getEmailFromHeader')
          .mockImplementationOnce(() => Promise.resolve('test@gmail.com'));

        const { body } = await request(app.getHttpServer())
          .get('/me')
          .set('Authorization', 'did-token')
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });

      it('returns the error for jwt token', async () => {
        const token = jwt.sign(
          { sub: 'test@gmail.com', iat: Date.now() },
          'secret',
          {
            expiresIn: '1d',
          },
        );

        const { body } = await request(app.getHttpServer())
          .get('/me')
          .set(
            'Cookie',
            cookie.serialize('jwt', String(token), {
              httpOnly: true,
              maxAge: 60 * 60 * 24,
            }),
          )
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('fails to validate token email', () => {
      it('returns the error', async () => {
        const { body } = await request(app.getHttpServer())
          .get('/me')
          .set(
            'Authorization',
            'Bearer 4a492e6ee781be0f12fff2a7921846b14d2a11dcdfb004dd0a06edf28665d654.uuC9pgfmIDqvG785e1xikW7POUM',
          )
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });

      it('returns the error for jwt token', async () => {
        const token = jwt.sign(
          { sub: 'test@gmail.com', iat: Date.now() },
          'secret1',
          {
            expiresIn: '1d',
          },
        );

        const { body } = await request(app.getHttpServer())
          .get('/me')
          .set(
            'Cookie',
            cookie.serialize('jwt', String(token), {
              httpOnly: true,
              maxAge: 60 * 60 * 24,
            }),
          )
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });

    describe('fails to get email', () => {
      it('returns the error', async () => {
        jest
          .spyOn(magicLinkService, 'getEmailFromToken')
          .mockImplementationOnce(() =>
            Promise.reject(new Error('No email found for token')),
          );

        const { body } = await request(app.getHttpServer())
          .get('/me')
          .set(
            'Authorization',
            'Bearer 4a492e6ee781be0f12fff2a7921846b14d2a11dcdfb004dd0a06edf28665d654.uuC9pgfmIDqvG785e1xikW7POUM',
          )
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });

      it('returns the error for jwt token', async () => {
        const token = jwt.sign(
          { name: 'test@gmail.com', iat: Date.now() },
          'secret1',
          {
            expiresIn: '1d',
          },
        );

        const { body } = await request(app.getHttpServer())
          .get('/me')
          .set(
            'Cookie',
            cookie.serialize('jwt', String(token), {
              httpOnly: true,
              maxAge: 60 * 60 * 24,
            }),
          )
          .expect(HttpStatus.UNAUTHORIZED);

        expect(body).toMatchSnapshot();
      });
    });
  });
});
