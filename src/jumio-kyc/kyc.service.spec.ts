/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { LoggerService } from '../logger/logger.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { CALLBACK_FIXTURE } from './fixtures/callback';
import { KycService } from './kyc.service';

describe('JumioApiService', () => {
  let app: INestApplication;
  let jumioTransactionService: JumioTransactionService;
  let loggerService: LoggerService;
  let redemptionService: RedemptionService;
  let usersService: UsersService;
  let kycService: KycService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    jumioTransactionService = app.get(JumioTransactionService);
    loggerService = app.get(LoggerService);
    kycService = app.get(KycService);
    usersService = app.get(UsersService);
    redemptionService = app.get(RedemptionService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('handleCallback', () => {
    describe('when calling with valid data', () => {
      it('throws when tokens do not match', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: 'IDN',
          enable_kyc: true,
        });
        const accountId = uuid();
        const workflowId = uuid();
        const token = uuid();
        await jumioTransactionService.create(
          user,
          workflowId,
          'http://foo.bar',
          token,
        );
        const callbackData = CALLBACK_FIXTURE(
          accountId,
          workflowId,
          '!!!!!!!!WRONG TOKEN!!!!!!!!!',
          'PROCESSED',
        );
        const loggerError = jest.spyOn(loggerService, 'error').mockClear();
        await kycService.handleCallback(callbackData);
        expect(loggerError).toHaveBeenCalledTimes(1);
      });
      it('succeeds when tokens do match', async () => {
        const user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: 'IDN',
          enable_kyc: true,
        });
        const accountId = uuid();
        const workflowId = uuid();
        const token = uuid();
        await jumioTransactionService.create(
          user,
          workflowId,
          'http://foo.bar',
          token,
        );
        const redemption = await redemptionService.create(user, 'fakeaddress');
        // return earlier because this workflow is already submitted
        await redemptionService.update(redemption, {
          kyc_status: KycStatus.SUBMITTED,
        });
        const callbackData = CALLBACK_FIXTURE(
          accountId,
          workflowId,
          token,
          'PROCESSED',
        );

        const loggerError = jest.spyOn(loggerService, 'error').mockClear();
        await kycService.handleCallback(callbackData);
        expect(loggerError).toHaveBeenCalledTimes(0);
      });
    });
  });
});
