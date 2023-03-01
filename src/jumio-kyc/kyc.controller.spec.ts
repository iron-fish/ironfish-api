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
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { KycService } from './kyc.service';
import { serializeKyc } from './utils/serialize-kyc';

describe('KycController', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let prisma: PrismaService;
  let magicLinkService: MagicLinkService;
  let kycService: KycService;
  let redemptionService: RedemptionService;
  let jumioApiService: JumioApiService;
  let jumioTransactionService: JumioTransactionService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
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
          account: {
            id: uuid(),
          },
          web: {
            href: 'http://kyc/test',
          },
          workflowExecution: {
            id: uuid(),
          },
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

    await prisma.userPoints.update({
      data: {
        total_points: 1,
      },
      where: {
        user_id: user.id,
      },
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
      const jumioTransaction = await jumioTransactionService.findLatestOrThrow(
        user,
      );
      if (!redemption || !redemption.jumio_account_id) {
        throw Error('Should have been created by api');
      }
      expect(body).toMatchObject(serializeKyc(redemption, jumioTransaction));
    });
  });

  describe('GET /kyc', () => {
    it('retrieves kyc info when it exists', async () => {
      const user = await mockUser();
      const { redemption, transaction } = await kycService.attempt(user, 'foo');

      const { body } = await request(app.getHttpServer())
        .get(`/kyc`)
        .set('Authorization', 'did-token')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject(serializeKyc(redemption, transaction));
    });
  });
});
