/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from './users.service';

describe('RegistrationController', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    usersService = app.get(UsersService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /registration/:token/confirm', () => {
    describe('with an invalid token', () => {
      it('redirects with an error toast', async () => {
        const message = 'Invalid confirmation token';
        const { header } = await request(app.getHttpServer())
          .get('/registration/token/confirm')
          .expect(HttpStatus.FOUND);

        expect((header as Record<string, unknown>).location).toBe(
          `${config.get<string>(
            'INCENTIVIZED_TESTNET_URL',
          )}/login?toast=${Buffer.from(message).toString('base64')}`,
        );
      });
    });

    describe('with an already confirmed user', () => {
      it('redirects with an error toast', async () => {
        const message = 'Invalid confirmation token';
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });
        await usersService.confirm(user);

        const { header } = await request(app.getHttpServer())
          .get(`/registration/${user.confirmation_token}/confirm`)
          .expect(HttpStatus.FOUND);

        expect((header as Record<string, unknown>).location).toBe(
          `${config.get<string>(
            'INCENTIVIZED_TESTNET_URL',
          )}/login?toast=${Buffer.from(message).toString('base64')}`,
        );
      });
    });

    describe('with a valid token and unconfirmed user', () => {
      it('redirects to the login page of the incentivized testnet', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          country_code: faker.address.countryCode('alpha-3'),
        });

        const { header } = await request(app.getHttpServer())
          .get(`/registration/${user.confirmation_token}/confirm`)
          .expect(HttpStatus.FOUND);

        expect((header as Record<string, unknown>).location).toBe(
          `${config.get<string>(
            'INCENTIVIZED_TESTNET_URL',
          )}/login?confirmed=true`,
        );
      });
    });
  });
});
