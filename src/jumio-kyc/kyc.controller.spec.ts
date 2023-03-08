/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { DecisionStatus, KycStatus, User } from '@prisma/client';
import assert from 'assert';
import axios from 'axios';
import faker from 'faker';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { CALLBACK_FIXTURE } from './fixtures/callback';
import { WORKFLOW_RETRIEVE_FIXTURE } from './fixtures/workflow';
import { KycService } from './kyc.service';
import { serializeKyc } from './utils/serialize-kyc';

describe('KycController', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let prisma: PrismaService;
  let config: ApiConfigService;
  let magicLinkService: MagicLinkService;
  let kycService: KycService;
  let redemptionService: RedemptionService;
  let jumioApiService: JumioApiService;
  let jumioTransactionService: JumioTransactionService;
  let graphileWorkerService: GraphileWorkerService;

  let API_KEY: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    prisma = app.get(PrismaService);
    config = app.get(ApiConfigService);
    magicLinkService = app.get(MagicLinkService);
    usersService = app.get(UsersService);
    kycService = app.get(KycService);
    redemptionService = app.get(RedemptionService);
    jumioApiService = app.get(JumioApiService);
    jumioTransactionService = app.get(JumioTransactionService);
    graphileWorkerService = app.get(GraphileWorkerService);

    API_KEY = app.get(ApiConfigService).get<string>('IRONFISH_API_KEY');

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

  const mockUser = async (country: string | null = null): Promise<User> => {
    const user = await usersService.create({
      email: faker.internet.email(),
      graffiti: uuid(),
      countryCode: country ?? 'IDN',
      enable_kyc: true,
    });

    await prisma.userPoints.update({
      data: {
        pool1_points: 3,
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
        .send({ public_address: 'foo' })
        .expect(HttpStatus.CREATED);

      const redemption = await redemptionService.find(user);
      const jumioTransaction = await jumioTransactionService.findLatestOrThrow(
        user,
      );

      assert.ok(redemption);
      expect(body).toMatchObject(
        serializeKyc(
          redemption,
          jumioTransaction,
          true,
          '',
          false,
          'Redemption status is not TRY_AGAIN: IN_PROGRESS',
          config,
        ),
      );
    });

    it('banned user country gets error', async () => {
      const user = await mockUser('PRK');

      await expect(kycService.attempt(user, 'foo')).rejects.toThrow(
        'The country associated with your account is banned: PRK',
      );

      await request(app.getHttpServer())
        .post(`/kyc`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.FORBIDDEN);

      const { body } = await request(app.getHttpServer())
        .get(`/kyc`)
        .set('Authorization', 'did-token')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({ can_attempt: false });
    });
  });

  describe('POST /callback', () => {
    it('resolves 200 when transaction found/updated', async () => {
      const user = await mockUser();

      // create user
      await request(app.getHttpServer())
        .post(`/kyc`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.CREATED);

      let redemption = await redemptionService.findOrThrow(user);
      assert.ok(redemption.jumio_account_id);
      expect(redemption.kyc_status).toBe(KycStatus.IN_PROGRESS);

      const transaction = await jumioTransactionService.findLatestOrThrow(user);

      const callbackData = CALLBACK_FIXTURE(
        redemption.jumio_account_id,
        transaction.workflow_execution_id,
        'PROCESSED',
      );

      jest.spyOn(axios, 'get').mockResolvedValueOnce({
        data: WORKFLOW_RETRIEVE_FIXTURE(
          'PROCESSED',
          'CHL',
          DecisionStatus.PASSED,
        ),
      });
      jest
        .spyOn(kycService, 'isSignatureValid')
        .mockImplementationOnce(() => true);

      await request(app.getHttpServer())
        .post('/kyc/callback')
        .set('Authorization', 'did-token')
        .send(callbackData)
        .expect(HttpStatus.OK);

      redemption = await redemptionService.findOrThrow(user);
      expect(redemption.kyc_status).toBe(KycStatus.SUBMITTED);
    });

    describe('with an invalid signature', () => {
      it('returns a 403', async () => {
        const user = await mockUser();

        await request(app.getHttpServer())
          .post(`/kyc`)
          .set('Authorization', 'did-token')
          .send({
            public_address: 'foo',
          })
          .expect(HttpStatus.CREATED);

        const redemption = await redemptionService.findOrThrow(user);
        assert.ok(redemption.jumio_account_id);
        expect(redemption.kyc_status).toBe(KycStatus.IN_PROGRESS);

        const transaction = await jumioTransactionService.findLatestOrThrow(
          user,
        );

        const callbackData = CALLBACK_FIXTURE(
          redemption.jumio_account_id,
          transaction.workflow_execution_id,
          'PROCESSED',
        );

        jest.spyOn(axios, 'get').mockResolvedValueOnce({
          data: WORKFLOW_RETRIEVE_FIXTURE(
            'PROCESSED',
            'CHL',
            DecisionStatus.PASSED,
          ),
        });

        await request(app.getHttpServer())
          .post('/kyc/callback')
          .set('Authorization', 'did-token')
          .send(callbackData)
          .expect(HttpStatus.FORBIDDEN);
      });
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

      expect(body).toMatchObject(
        serializeKyc(
          redemption,
          transaction,
          true,
          '',
          false,
          'Redemption status is not TRY_AGAIN: IN_PROGRESS',
          config,
        ),
      );
    });
  });

  describe('GET /kyc/config', () => {
    it('returns information about each phase along with kyc deadlines', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/kyc/config')
        .expect(HttpStatus.OK);

      expect(body).toMatchObject({
        data: [
          {
            airdrop_completed_by: '2023-03-16T00:00:00.000Z',
            coins: 105000,
            kyc_completed_by: '2023-03-13T00:00:00.000Z',
            name: 'pool_three',
            pool_name: 'Code Contributions Pool',
          },
          {
            airdrop_completed_by: '2023-03-23T00:00:00.000Z',
            coins: 420000,
            kyc_completed_by: '2023-03-19T00:00:00.000Z',
            name: 'pool_one',
            pool_name: 'Phase 1 Pool',
          },
          {
            airdrop_completed_by: '2023-03-30T00:00:00.000Z',
            coins: 210000,
            kyc_completed_by: '2023-03-26T00:00:00.000Z',
            name: 'pool_two',
            pool_name: 'Phase 2 Pool',
          },
          {
            airdrop_completed_by: '2023-04-06T00:00:00.000Z',
            coins: 210000,
            kyc_completed_by: '2023-03-26T00:00:00.000Z',
            name: 'pool_four',
            pool_name: 'Phase 3 Pool',
          },
        ],
      });
    });

    describe('POST /kyc/refresh', () => {
      describe('with a missing api key', () => {
        it('returns a 401 status code', async () => {
          await request(app.getHttpServer())
            .post('/user_points/refresh')
            .expect(HttpStatus.UNAUTHORIZED);
        });
      });

      it('enqueues a job to refresh users points', async () => {
        const addJob = jest
          .spyOn(graphileWorkerService, 'addJob')
          .mockImplementationOnce(jest.fn());

        await request(app.getHttpServer())
          .post('/user_points/refresh')
          .set('Authorization', `Bearer ${API_KEY}`)
          .expect(HttpStatus.CREATED);

        expect(addJob).toHaveBeenCalledWith(
          GraphileWorkerPattern.REFRESH_USERS_POINTS,
        );
      });
    });
  });
});
