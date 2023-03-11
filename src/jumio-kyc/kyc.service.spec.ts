/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import assert from 'assert';
import axios from 'axios';
import crypto from 'crypto';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { JUMIO_CREATE_RESPONSE } from './fixtures/jumio-create-response';
import { WORKFLOW_RETRIEVE_FIXTURE } from './fixtures/workflow';
import { KycService } from './kyc.service';

describe('KycService', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let config: ApiConfigService;
  let usersService: UsersService;
  let kycService: KycService;
  let redemptionService: RedemptionService;
  let jumioApiService: JumioApiService;
  let jumioTransactionService: JumioTransactionService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
    config = app.get(ApiConfigService);
    kycService = app.get(KycService);
    usersService = app.get(UsersService);
    redemptionService = app.get(RedemptionService);
    jumioTransactionService = app.get(JumioTransactionService);
    jumioApiService = app.get(JumioApiService);

    jest
      .spyOn(jumioApiService, 'createAccountAndTransaction')
      .mockImplementation(() => Promise.resolve(JUMIO_CREATE_RESPONSE));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('refresh', () => {
    it('should refresh the redemption', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: 'USA',
        enable_kyc: true,
      });

      await prisma.userPoints.update({
        data: { pool1_points: 3 },
        where: { user_id: user.id },
      });

      let { redemption, transaction } = await kycService.attempt(
        user,
        '',
        '127.0.0.1',
      );
      expect(redemption.kyc_status).toBe(KycStatus.IN_PROGRESS);
      assert.ok(redemption.jumio_account_id);

      jest.spyOn(axios, 'get').mockResolvedValueOnce({
        data: WORKFLOW_RETRIEVE_FIXTURE('PROCESSED', 'USA', 'PASSED'),
      });

      await kycService.refresh(redemption, transaction);

      redemption = await redemptionService.findOrThrow(user);
      expect(redemption.kyc_status).toBe(KycStatus.SUCCESS);

      transaction = await jumioTransactionService.findOrThrow(transaction.id);
      expect(transaction.decision_status).toBe('PASSED');
      expect(transaction.last_workflow_fetch).toBeTruthy();
      expect(transaction.last_callback).toBeNull();
      expect(transaction.last_callback_at).toBeNull();
    });
  });

  describe('markComplete', () => {
    it('should set the redemption as waiting', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: 'USA',
        enable_kyc: true,
      });

      await prisma.userPoints.update({
        data: { pool1_points: 3 },
        where: { user_id: user.id },
      });

      let { redemption } = await kycService.attempt(user, '', '127.0.0.1');
      expect(redemption.kyc_status).toBe(KycStatus.IN_PROGRESS);

      await kycService.markComplete(user);

      redemption = await redemptionService.findOrThrow(user);
      expect(redemption.kyc_status).toBe(KycStatus.WAITING_FOR_CALLBACK);
    });
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
