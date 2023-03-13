/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { DecisionStatus, KycStatus } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { AIRDROP_CONFIG } from '../common/constants';
import { ImageChecksLabel } from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { IMAGE_CHECK_FIXTURE } from '../jumio-kyc/fixtures/image-check';
import { LIVENESS_CHECK_FIXTURE } from '../jumio-kyc/fixtures/liveness-check';
import { WATCHLIST_SCREEN_FIXTURE } from '../jumio-kyc/fixtures/watch-list';
import { WORKFLOW_RETRIEVE_FIXTURE } from '../jumio-kyc/fixtures/workflow';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { RedemptionService } from './redemption.service';

describe('RedemptionServiceSpec', () => {
  let app: INestApplication;
  let redemptionService: RedemptionService;
  let usersService: UsersService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    redemptionService = app.get(RedemptionService);
    usersService = app.get(UsersService);
    prismaService = app.get(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('calculateStatus', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return banned if user from PRK', async () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE('PROCESSED', 'PRK', 'PASSED');
      const status = await redemptionService.calculateStatus(fixture);
      expect(status).toEqual({
        status: KycStatus.FAILED,
        failureMessage: 'Failure: Banned Country',
        idDetails: [
          {
            id_issuing_country: 'PRK',
            id_subtype: 'NATIONAL_ID',
            id_type: 'ID_CARD',
          },
        ],
      });
    });

    it('should not ban with acceptable country', async () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE('PROCESSED', 'CHL', 'PASSED');
      const status = await redemptionService.calculateStatus(fixture);
      expect(status).toEqual({
        status: KycStatus.SUCCESS,
        failureMessage: null,
        idDetails: [
          {
            id_issuing_country: 'CHL',
            id_subtype: 'NATIONAL_ID',
            id_type: 'ID_CARD',
          },
        ],
      });
    });
  });

  describe('redemption.update', () => {
    it('should store id details on redemption', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: 'IDN',
        enable_kyc: true,
      });
      let redemption = await redemptionService.create(
        user,
        'fakepublicaddress',
        '127.0.0.1',
      );
      const idDetails = [
        {
          id_issuing_country: 'PRK',
          id_subtype: 'NATIONAL_ID',
          id_type: 'ID_CARD',
        },
      ];
      redemption = await redemptionService.update(redemption, {
        kycStatus: KycStatus.FAILED,
        failureMessage: 'Failure: Banned Country',
        idDetails,
      });
      expect(redemption.id_details).toEqual(idDetails);
    });
  });

  describe('userDeadline', () => {
    it('should return pool2 date if user only has pool2', async () => {
      const userPoints = await prismaService.userPoints.create({
        data: {
          user: {
            create: {
              email: faker.internet.email(),
              graffiti: uuid(),
              country_code: 'IDN',
              enable_kyc: true,
            },
          },
          pool2_points: 100,
        },
      });
      const pool2 = AIRDROP_CONFIG.data.find((a) => a.name === 'pool_two');
      assert.ok(pool2);
      const calculatedDate = await redemptionService.userDeadline(
        userPoints.user_id,
      );
      expect(calculatedDate).toEqual(pool2?.kyc_completed_by);
    });
    it('should return max date if user only has all pools', async () => {
      const userPoints = await prismaService.userPoints.create({
        data: {
          user: {
            create: {
              email: faker.internet.email(),
              graffiti: uuid(),
              country_code: 'IDN',
              enable_kyc: true,
            },
          },
          pool1_points: 100,
          pool2_points: 100,
          pool3_points: 100,
          pool4_points: 100,
        },
      });
      const calculatedDate = await redemptionService.userDeadline(
        userPoints.user_id,
      );
      const maxDate = new Date(
        Math.max(
          ...AIRDROP_CONFIG.data.map((p) => p.kyc_completed_by.getTime()),
        ),
      );
      expect(calculatedDate).toEqual(maxDate);
    });
  });

  describe('isEligible', () => {
    it('should not be eligible if past kyc requirement date', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: 'IDN',
        enable_kyc: true,
      });
      const redemption = await redemptionService.create(
        user,
        'fakepublicaddress',
        '127.0.0.1',
      );
      await prismaService.userPoints.update({
        data: {
          pool2_points: 100,
        },
        where: {
          user_id: user.id,
        },
      });
      // We are now in the year 2090
      jest
        .spyOn(redemptionService, 'currentDate')
        .mockImplementationOnce(() => new Date(3792511175000));
      const eligiblity = await redemptionService.isEligible(user, redemption);
      expect(eligiblity.eligible).toBe(false);
      expect(eligiblity.reason).toContain(
        'Your final deadline for kyc has passed',
      );
    });

    it('should be eligible if success and max attempts', async () => {
      const user = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: 'IDN',
        enable_kyc: true,
      });

      let redemption = await redemptionService.create(
        user,
        'fakepublicaddress',
        '127.0.0.1',
      );

      redemption = await prismaService.redemption.update({
        data: { kyc_status: KycStatus.SUCCESS, kyc_attempts: 5 },
        where: { id: redemption.id },
      });

      await prismaService.userPoints.update({
        data: {
          pool2_points: 100,
        },
        where: {
          user_id: user.id,
        },
      });

      await expect(
        redemptionService.isEligible(user, redemption),
      ).resolves.toMatchObject({ eligible: true });
    });
  });

  describe('multi account detection', () => {
    it('should reject scammer with face from different user', async () => {
      /********* SETUP *******/
      // two accounts, one user
      const user1Account1 = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: 'IDN',
        enable_kyc: true,
      });
      const user1Account2 = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: 'IDN',
        enable_kyc: true,
      });
      const workflow1Id = uuid();
      // user already passed 1 kyc with account1
      await prismaService.jumioTransaction.create({
        data: {
          user_id: user1Account1.id,
          web_href: 'http://jumio.com/uuid',
          decision_status: 'PASSED',
          workflow_execution_id: workflow1Id,
        },
      });
      const imageCheck = {
        id: '1568893e-5edc-453c-9c50-e47fa10578f8',
        credentials: [
          {
            id: 'fakecredentialsid',
            category: 'ID',
          },
          {
            id: 'fakecredentialsid',
            category: 'SELFIE',
          },
        ],
        decision: {
          type: 'WARNING',
          details: {
            label: 'REPEATED_FACE' as ImageChecksLabel,
          },
        },
        data: {
          faceSearchFindings: {
            status: 'DONE',
            findings: [workflow1Id],
          },
        },
      };
      /******* ENDSETUP *****/
      const repeatedFaces = redemptionService.getRepeatedFaceWorkflowIds([
        imageCheck,
      ]);
      const check = await redemptionService.multiAccountFailure(
        user1Account2.id,
        repeatedFaces,
      );
      expect(check).toContain('User with multiple accounts detected');
    });

    it('should allow submission of repeated face from same user', async () => {
      /********* SETUP *******/
      // two accounts, one user
      const user1Account1 = await usersService.create({
        email: faker.internet.email(),
        graffiti: uuid(),
        countryCode: 'IDN',
        enable_kyc: true,
      });
      const workflow1Id = uuid();
      // user already passed 1 kyc with account1
      await prismaService.jumioTransaction.create({
        data: {
          user_id: user1Account1.id,
          web_href: 'http://jumio.com/uuid',
          decision_status: 'PASSED',
          workflow_execution_id: workflow1Id,
        },
      });
      const imageCheck = {
        id: '1568893e-5edc-453c-9c50-e47fa10578f8',
        credentials: [
          {
            id: 'fakecredentialsid',
            category: 'ID',
          },
          {
            id: 'fakecredentialsid',
            category: 'SELFIE',
          },
        ],
        decision: {
          type: 'WARNING',
          details: {
            label: 'REPEATED_FACE' as ImageChecksLabel,
          },
        },
        data: {
          faceSearchFindings: {
            status: 'DONE',
            findings: [workflow1Id],
          },
        },
      };
      /******* ENDSETUP *****/
      const repeatedFaces = redemptionService.getRepeatedFaceWorkflowIds([
        imageCheck,
      ]);
      const check = await redemptionService.multiAccountFailure(
        user1Account1.id,
        repeatedFaces,
      );
      expect(check).toBeNull();
      const fixture = WORKFLOW_RETRIEVE_FIXTURE(
        'PROCESSED',
        'CHL',
        DecisionStatus.REJECTED,
        String(user1Account1.id),
        imageCheck,
      );
      const labels = redemptionService.getTransactionLabels(fixture);
      const acceptableFace = redemptionService.hasOnlyBenignWarnings(labels);
      expect(acceptableFace).toBe(true);
    });

    it('should allow LIVENESS_UNDETERMINED warning for success if risk score acceptable', async () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE(
        'PROCESSED',
        'CHL',
        DecisionStatus.WARNING,
        '1231232',
        IMAGE_CHECK_FIXTURE('OK'),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        LIVENESS_CHECK_FIXTURE('LIVENESS_UNDETERMINED'),
        49,
      );
      const status = await redemptionService.calculateStatus(fixture);
      expect(status).toMatchObject({
        status: KycStatus.SUCCESS,
        failureMessage: expect.stringContaining('Benign'),
      });
    });

    it('should NOT allow LIVENESS_UNDETERMINED warning for success if risk score is too high', async () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE(
        'PROCESSED',
        'CHL',
        DecisionStatus.WARNING,
        '1231232',
        IMAGE_CHECK_FIXTURE('OK'),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        LIVENESS_CHECK_FIXTURE('LIVENESS_UNDETERMINED'),
        51,
      );
      const status = await redemptionService.calculateStatus(fixture);
      expect(status).toMatchObject({
        status: KycStatus.TRY_AGAIN,
        failureMessage: null,
      });
    });
  });

  describe('watchlistScreeningFailure', () => {
    it('should return failure if user has alerted status', () => {
      expect(
        redemptionService.watchlistScreeningFailure([
          WATCHLIST_SCREEN_FIXTURE('ALERT', 0),
        ]),
      ).not.toBeNull();
    });

    it('should not fail if if label is WARNING', () => {
      expect(
        redemptionService.watchlistScreeningFailure([
          WATCHLIST_SCREEN_FIXTURE('WARNING', 0),
        ]),
      ).toBeNull();
    });

    it('should not fail if if label is VALIDATION_FAILED', () => {
      expect(
        redemptionService.watchlistScreeningFailure([
          WATCHLIST_SCREEN_FIXTURE('VALIDATION_FAILED', 0),
        ]),
      ).toBeNull();
    });

    it('should not fail if status is ok and no results were returned', () => {
      expect(
        redemptionService.watchlistScreeningFailure([
          WATCHLIST_SCREEN_FIXTURE('OK', 0),
        ]),
      ).toBeNull();
    });
  });
});
