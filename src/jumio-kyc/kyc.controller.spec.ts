/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { User } from '@prisma/client';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { KycService } from './kyc.service';
import { serializeKyc } from './utils/serialize-kyc';

describe('KycController', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let magicLinkService: MagicLinkService;
  let kycService: KycService;
  let redemptionService: RedemptionService;
  let jumioApiService: JumioApiService;
  let jumioTransactionService: JumioTransactionService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    magicLinkService = app.get(MagicLinkService);
    usersService = app.get(UsersService);
    kycService = app.get(KycService);
    redemptionService = app.get(RedemptionService);
    jumioApiService = app.get(JumioApiService);
    jumioTransactionService = app.get(JumioTransactionService);
    jest
      .spyOn(jumioApiService, 'createAccountAndTransaction')
      .mockImplementation(() =>
        Promise.resolve({
          jumio_account_id: uuid(),
          jumio_workflow_execution_id: uuid(),
          jumio_web_href: 'http://foo.test.jumio/?token=asdfaf',
        }),
      );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const mockUser = async (): Promise<User> => {
    const user = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      countryCode: faker.address.countryCode('alpha-3'),
    });
    jest
      .spyOn(magicLinkService, 'getEmailFromHeader')
      .mockImplementation(() => Promise.resolve(user.email));
    return user;
  };

  describe('POST /kyc', () => {
    it('starts kyc, creates new redemption/jumio account/jumio transaction', async () => {
      const user = await mockUser();
      const { body } = await request(app.getHttpServer())
        .post(`/kyc`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.CREATED);
      const redemption = await redemptionService.find(user);
      const jumioTransaction = await jumioTransactionService.findOrThrow(user);
      if (!redemption || !redemption.jumio_account_id) {
        throw Error('Should have been created by api');
      }
      expect(body).toMatchObject(
        serializeKyc(
          redemption,
          redemption.jumio_account_id,
          jumioTransaction.workflow_execution_id,
          jumioTransaction.web_href,
        ),
      );
    });
    it('fails if user already has redemption', async () => {
      const user = await mockUser();
      // create redemption
      await redemptionService.getOrCreate(user, 'bar');
      await request(app.getHttpServer())
        .post(`/kyc`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });
  });

  describe('GET /kyc', () => {
    it('retrieves kyc info when it exists', async () => {
      const user = await mockUser();
      const redemption = await redemptionService.getOrCreate(
        user,
        'fakePublicAddress',
      );
      const kycDetails = await kycService.attempt(
        user,
        redemption.public_address,
      );
      const { body } = await request(app.getHttpServer())
        .get(`/kyc`)
        .set('Authorization', 'did-token')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject(
        serializeKyc(
          redemption,
          kycDetails.jumio_account_id,
          kycDetails.status,
          kycDetails.jumio_workflow_execution_id,
          kycDetails.jumio_web_href,
        ),
      );
    });
    it('fails if already present', async () => {
      await mockUser();
      // no redemption created for user
      await request(app.getHttpServer())
        .get(`/kyc`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
