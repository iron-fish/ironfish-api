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
import { JumioTransactionRetrieveResponse } from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { CALLBACK_FIXTURE } from './fixtures/callback';
import { JUMIO_CREATE_RESPONSE } from './fixtures/jumio-create-response';
import { WORKFLOW_CREATE_WATCHLIST_RESPONSE } from './fixtures/watchlist-create-response';
import { WATCHLIST_PUT_RESPONSE } from './fixtures/watchlist-put-response';
import { WATCHLIST_DATA_UPLOAD_RESPONSE } from './fixtures/watchlist-upload-response';
import { WORKFLOW_RETRIEVE_FIXTURE } from './fixtures/workflow';
import { WORKFLOW_RETRIEVE_WATCHLIST } from './fixtures/workflow-watchlist';
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
      .mockImplementation(() => Promise.resolve(JUMIO_CREATE_RESPONSE));

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
          '',
          config,
        ),
      );
    });

    it('banned user country gets error', async () => {
      const user = await mockUser('PRK');

      await expect(
        kycService.attempt(user, 'foo', '127.0.0.1'),
      ).rejects.toThrow(
        'The country associated with your graffiti is banned: PRK',
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

    it('ip address is saved', async () => {
      const user = await mockUser();
      await request(app.getHttpServer())
        .post(`/kyc`)
        .set('Authorization', 'did-token')
        .send({
          public_address: 'foo',
        })
        .expect(HttpStatus.CREATED);
      const redemption = await redemptionService.find(user);
      expect(redemption?.hashed_ip_address).toBe(
        '3e48ef9d22e096da6838540fb846999890462c8a32730a4f7a5eaee6945315f7',
      );
    });
  });

  describe('PUT /kyc', () => {
    it('updates public address of user', async () => {
      const user = await mockUser();
      let redemption = await redemptionService.create(
        user,
        'fakeaddress',
        'fakeip',
      );
      await request(app.getHttpServer())
        .put(`/kyc`)
        .set('Authorization', 'did-token')
        .send({ public_address: 'updatedaddress' })
        .expect(HttpStatus.OK);
      redemption = await redemptionService.findOrThrow(user);
      expect(redemption.public_address).toBe('updatedaddress');
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
        data: WORKFLOW_RETRIEVE_FIXTURE({
          userId: user.id.toString(),
        }),
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
      expect(redemption.kyc_status).toBe(KycStatus.SUCCESS);
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
          data: WORKFLOW_RETRIEVE_FIXTURE({
            decisionStatus: DecisionStatus.PASSED,
          }),
        });

        await request(app.getHttpServer())
          .post('/kyc/callback')
          .set('Authorization', 'did-token')
          .send(callbackData)
          .expect(HttpStatus.FORBIDDEN);
      });
    });

    describe('standalone watchlist', () => {
      it.each([
        [WORKFLOW_RETRIEVE_WATCHLIST('OK'), KycStatus.SUCCESS],
        [WORKFLOW_RETRIEVE_WATCHLIST('ALERT'), KycStatus.FAILED],
      ])(
        'moves user to successful when requirements are met',
        async (
          watchlistRetrieve: JumioTransactionRetrieveResponse,
          expectedStatus: KycStatus,
        ) => {
          const user = await mockUser();

          let redemption = await redemptionService.create(user, 'foo', 'foo');

          const transaction = await jumioTransactionService.create(
            user,
            'fakeworkflow',
            'http://fake.com',
          );
          await jumioTransactionService.update(transaction, {
            decisionStatus: DecisionStatus.PASSED,
            lastWorkflowFetch: WORKFLOW_RETRIEVE_FIXTURE(),
          });
          redemption = await redemptionService.update(redemption, {
            kycStatus: KycStatus.SUBMITTED,
            jumioAccountId: 'jumioaccountid',
          });
          jest
            .spyOn(jumioApiService, 'createAccountAndTransaction')
            .mockResolvedValueOnce(WORKFLOW_CREATE_WATCHLIST_RESPONSE);
          jest
            .spyOn(jumioApiService, 'transactionStatus')
            .mockResolvedValueOnce(WORKFLOW_RETRIEVE_FIXTURE());
          jest
            .spyOn(jumioApiService, 'uploadScreeningData')
            .mockResolvedValueOnce(WATCHLIST_DATA_UPLOAD_RESPONSE);
          jest
            .spyOn(jumioApiService, 'putStandaloneScreening')
            .mockResolvedValueOnce(WATCHLIST_PUT_RESPONSE);

          const standaloneTransaction = await kycService.standaloneWatchlist(
            user.id,
          );

          assert.ok(redemption.jumio_account_id);
          const callbackData = CALLBACK_FIXTURE(
            redemption.jumio_account_id,
            standaloneTransaction.workflow_execution_id,
            'PROCESSED',
          );

          jest
            .spyOn(jumioApiService, 'transactionStatus')
            .mockResolvedValueOnce(watchlistRetrieve);
          jest
            .spyOn(kycService, 'isSignatureValid')
            .mockImplementationOnce(() => true);
          const statusMock = jest.spyOn(redemptionService, 'calculateStatus');
          await request(app.getHttpServer())
            .post('/kyc/callback')
            .set('Authorization', 'did-token')
            .send(callbackData)
            .expect(HttpStatus.OK);

          expect(statusMock).toHaveBeenCalled();
          redemption = await redemptionService.findOrThrow(user);
          expect(redemption.kyc_status).toBe(expectedStatus);
        },
      );
    });
  });

  describe('GET /kyc', () => {
    it('retrieves kyc info when it exists', async () => {
      const user = await mockUser();
      const { redemption, transaction } = await kycService.attempt(
        user,
        'foo',
        '127.0.0.1',
      );

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
          '',
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
            airdrop_completed_by: '2023-04-21T00:00:00.000Z',
            coins: 105000,
            kyc_completed_by: '2023-04-14T00:00:00.000Z',
            name: 'pool_three',
            pool_name: 'Code Contributions Pool',
          },
          {
            airdrop_completed_by: '2023-04-21T00:00:00.000Z',
            coins: 420000,
            kyc_completed_by: '2023-04-14T00:00:00.000Z',
            name: 'pool_one',
            pool_name: 'Phase 1 Pool',
          },
          {
            airdrop_completed_by: '2023-04-21T00:00:00.000Z',
            coins: 210000,
            kyc_completed_by: '2023-04-14T00:00:00.000Z',
            name: 'pool_two',
            pool_name: 'Phase 2 Pool',
          },
          {
            airdrop_completed_by: '2023-04-21T00:00:00.000Z',
            coins: 210000,
            kyc_completed_by: '2023-04-14T00:00:00.000Z',
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
