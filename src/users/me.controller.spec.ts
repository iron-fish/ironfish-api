/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from './users.service';

describe('MeController', () => {
  let app: INestApplication;
  let magicLinkService: MagicLinkService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    magicLinkService = app.get(MagicLinkService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
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
          country_code: faker.address.countryCode('alpha-3'),
        });
        await usersService.confirm(user);

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
          graffiti: user.graffiti,
        });
      });
    });
  });
});
