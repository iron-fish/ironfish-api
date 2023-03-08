/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import assert from 'assert';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { AIRDROP_CONFIG } from '../common/constants';
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

    it('should return banned if user from PRK', () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE('PROCESSED', 'PRK', 'PASSED');
      const status = redemptionService.calculateStatus(fixture);
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

    it('should not ban with acceptable country', () => {
      const fixture = WORKFLOW_RETRIEVE_FIXTURE('PROCESSED', 'CHL', 'PASSED');
      const status = redemptionService.calculateStatus(fixture);
      expect(status).toEqual({
        status: KycStatus.SUBMITTED,
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
  });
});
