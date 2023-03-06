/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { WORKFLOW_RETRIEVE_FIXTURE } from '../jumio-kyc/fixtures/workflow';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { RedemptionService } from './redemption.service';

describe('RedemptionServiceSpec', () => {
  let app: INestApplication;
  let redemptionService: RedemptionService;
  let usersService: UsersService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    redemptionService = app.get(RedemptionService);
    usersService = app.get(UsersService);
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
});
