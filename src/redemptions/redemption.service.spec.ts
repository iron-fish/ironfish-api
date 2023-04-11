/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { DecisionStatus, KycStatus } from '@prisma/client';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ImageChecksLabel } from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { EXTRACTION_CHECK_FIXTURE } from '../jumio-kyc/fixtures/extraction-check';
import { IMAGE_CHECK_FIXTURE } from '../jumio-kyc/fixtures/image-check';
import { LIVENESS_CHECK_FIXTURE } from '../jumio-kyc/fixtures/liveness-check';
import { WATCHLIST_SCREEN_FIXTURE } from '../jumio-kyc/fixtures/watch-list';
import { WORKFLOW_RETRIEVE_FIXTURE } from '../jumio-kyc/fixtures/workflow';
import { WORKFLOW_EXPIRED } from '../jumio-kyc/fixtures/workflow-expired';
import { WORKFLOW_SIMILARITY } from '../jumio-kyc/fixtures/workflow-similarity';
import { WORKFLOW_UNSUPPORTED } from '../jumio-kyc/fixtures/workflow-unsupported';
import { WORKFLOW_USABILITY_ERROR } from '../jumio-kyc/fixtures/workflow-usability-error';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { APPROVED_LIVENESS_FAILURE_FIXTURE } from './fixtures/approved-liveness-failure';
import { APPROVED_LIVENESS_UNDETERMINED_FIXTURE } from './fixtures/approved-liveness-undertermined';
import { APPROVED_REPEATED_FACE_FAILURE } from './fixtures/approved-repeated-face-failure';
import { HELP_URLS, RedemptionService } from './redemption.service';

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
      const fixture = WORKFLOW_RETRIEVE_FIXTURE({
        extractionCheck: EXTRACTION_CHECK_FIXTURE({ idCountryCode: 'PRK' }),
      });

      const status = await redemptionService.calculateStatus(fixture);

      expect(status).toMatchObject({
        status: KycStatus.FAILED,
        failureMessage: expect.stringContaining('banned PRK'),
        failureUrl: HELP_URLS.BANNED_COUNTRY_ID,
        idDetails: [
          {
            id_issuing_country: 'PRK',
            id_subtype: 'NATIONAL_ID',
            id_type: 'ID_CARD',
          },
        ],
      });
    });

    it('should detect unsupported document', async () => {
      const status = await redemptionService.calculateStatus(
        WORKFLOW_UNSUPPORTED,
      );

      expect(status).toMatchObject({
        status: KycStatus.TRY_AGAIN,
        failureMessage: 'Your ID is not supported.',
        failureUrl: HELP_URLS.DOC_UNSUPPORTED,
        idDetails: undefined,
        age: undefined,
      });
    });

    it('should try again on expired workflow', async () => {
      const status = await redemptionService.calculateStatus(WORKFLOW_EXPIRED);

      expect(status).toMatchObject({
        status: KycStatus.TRY_AGAIN,
        failureMessage: 'Time limit of 15 minutes.',
        failureUrl: HELP_URLS.EXPIRED,
        idDetails: undefined,
        age: undefined,
      });
    });

    it('should try again on similarity', async () => {
      const status = await redemptionService.calculateStatus(
        WORKFLOW_SIMILARITY,
      );

      expect(status).toMatchObject({
        status: KycStatus.SUCCESS,
        failureMessage: null,
        failureUrl: null,
      });
    });

    it('should check usability label', async () => {
      const status = await redemptionService.calculateStatus(
        WORKFLOW_USABILITY_ERROR,
      );

      expect(status).toMatchObject({
        status: KycStatus.TRY_AGAIN,
        failureUrl: HELP_URLS.DOC_MISSING_SIGNATURE,
      });
    });

    it('should not ban with acceptable country', async () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE();
      const status = await redemptionService.calculateStatus(fixture);

      expect(status).toMatchObject({
        status: KycStatus.SUCCESS,
        failureMessage: null,
        failureUrl: null,
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

    it('should not be eligible with kyc banned country', async () => {
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
      redemption = await redemptionService.update(redemption, {
        idDetails: [
          { id_issuing_country: 'PRK', id_subtype: 'foo', id_type: 'bar' },
        ],
      });
      await prismaService.userPoints.update({
        data: {
          pool2_points: 100,
        },
        where: {
          user_id: user.id,
        },
      });
      const eligiblity = await redemptionService.isEligible(user, redemption);
      expect(eligiblity.eligible).toBe(false);
      expect(eligiblity.reason).toBe(
        'A country associated with your KYC attempt is banned: PRK',
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
      expect(check).toContain(
        'You have already attempted KYC for another graffiti',
      );
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
      const fixture = WORKFLOW_RETRIEVE_FIXTURE({
        decisionStatus: DecisionStatus.REJECTED,
        userId: String(user1Account1.id),
        imageCheck,
      });
      const labels = redemptionService.getTransactionLabels(fixture);
      const acceptableFace =
        redemptionService.hasOnlyBenignFaceWarnings(labels);
      expect(acceptableFace).toBe(true);
    });

    it('should allow submission of repeated face from same user with multiple kycs', async () => {
      const status = await redemptionService.calculateStatus(
        APPROVED_REPEATED_FACE_FAILURE,
      );
      expect(status).toMatchObject({
        status: KycStatus.SUCCESS,
        failureMessage: null,
      });
    });

    it('should allow LIVENESS_UNDETERMINED warning for success if risk score acceptable', async () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE({
        imageCheck: IMAGE_CHECK_FIXTURE('OK'),
        livenessCheck: LIVENESS_CHECK_FIXTURE('LIVENESS_UNDETERMINED'),
        riskScore: 40,
      });
      const status = await redemptionService.calculateStatus(fixture);
      expect(status).toMatchObject({
        status: KycStatus.SUCCESS,
      });
    });

    it('should not allow minors to pass KYC', async () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE({
        extractionCheck: EXTRACTION_CHECK_FIXTURE({ age: 10 }),
      });

      const status = await redemptionService.calculateStatus(fixture);

      expect(status).toMatchObject({
        status: KycStatus.TRY_AGAIN,
        failureMessage: expect.stringContaining('10'),
        failureUrl: HELP_URLS.MIN_AGE,
      });
    });

    it('should allow adults to pass KYC', async () => {
      const age = 18;
      const fixture = WORKFLOW_RETRIEVE_FIXTURE({
        extractionCheck: EXTRACTION_CHECK_FIXTURE({
          age,
        }),
      });
      const status = await redemptionService.calculateStatus(fixture);
      expect(status).toMatchObject({
        status: KycStatus.SUCCESS,
        failureMessage: null,
      });
    });

    it('should bypass age check if not present', async () => {
      const extractionFixture = EXTRACTION_CHECK_FIXTURE();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { currentAge, ...data } = extractionFixture.data;
      const agelessFixture = {
        ...extractionFixture,
        data: data,
      };

      // remove the age from returned info
      const fixture = WORKFLOW_RETRIEVE_FIXTURE({
        extractionCheck: agelessFixture,
      });
      const status = await redemptionService.calculateStatus(fixture);
      expect(status).toMatchObject({
        status: KycStatus.SUCCESS,
        failureMessage: null,
      });
    });

    it('should NOT allow LIVENESS_UNDETERMINED warning for success if risk score is too high', async () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE({
        decisionStatus: DecisionStatus.WARNING,
        imageCheck: IMAGE_CHECK_FIXTURE('OK'),
        livenessCheck: LIVENESS_CHECK_FIXTURE('LIVENESS_UNDETERMINED'),
        riskScore: 51,
      });
      const status = await redemptionService.calculateStatus(fixture);
      expect(status).toMatchObject({
        status: KycStatus.TRY_AGAIN,
        failureMessage: expect.stringContaining('unknown'),
        failureUrl: HELP_URLS.UNKNOWN,
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

  describe('approve-list', () => {
    it('should allow benign liveness failure', () => {
      const matched = redemptionService.matchApprovedLabels(
        APPROVED_LIVENESS_FAILURE_FIXTURE,
      );
      expect(matched).toBe(true);
    });
    it('should allow benign liveness undetermined', () => {
      const matched = redemptionService.matchApprovedLabels(
        APPROVED_LIVENESS_UNDETERMINED_FIXTURE,
      );
      expect(matched).toBe(true);
    });
  });
});
