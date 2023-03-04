/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import crypto from 'crypto';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { KycService } from './kyc.service';

describe('KycService', () => {
  let app: INestApplication;
  let config: ApiConfigService;
  let usersService: UsersService;
  let kycService: KycService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    config = app.get(ApiConfigService);
    kycService = app.get(KycService);
    usersService = app.get(UsersService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('isSignatureValid', () => {
    describe('for a valid hash', () => {
      it('returns true', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: 'USA',
          enable_kyc: true,
        });

        const ts = new Date().getTime();
        const hmac = crypto
          .createHmac('sha256', config.get<string>('JUMIO_API_CALLBACK_SECRET'))
          .update(`${ts}.${user.id}`)
          .digest()
          .toString('hex');

        expect(kycService.isSignatureValid(`t=${ts},v1=${hmac}`, user)).toBe(
          true,
        );
      });
    });

    describe('for an invalid hash', () => {
      it('returns false', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: 'USA',
          enable_kyc: true,
        });

        const ts = new Date().getTime();
        const hmac = crypto
          .createHmac('sha256', config.get<string>('JUMIO_API_CALLBACK_SECRET'))
          .update(`${ts}.${user.id + 1}`)
          .digest()
          .toString('hex');

        expect(kycService.isSignatureValid(`t=${ts},v1=${hmac}`, user)).toBe(
          false,
        );
      });
    });
  });
});
