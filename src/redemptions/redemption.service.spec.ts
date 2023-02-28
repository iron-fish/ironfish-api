/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  BadRequestException,
  HttpException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { KycStatus, Redemption, User } from '@prisma/client';
import faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { bootstrapTestApp } from '../test/test-app';
import { UsersService } from '../users/users.service';
import { RedemptionService } from './redemption.service';

describe('RedemptionService', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redemptionService: RedemptionService;
  let configService: ApiConfigService;
  let usersService: UsersService;
  let user: User;
  let redemption: Redemption;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    redemptionService = app.get(RedemptionService);
    configService = app.get(ApiConfigService);
    usersService = app.get(UsersService);
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('incrementKyc', () => {
    describe('when increment method is called', () => {
      it('increments the KYC attempts by until exceeds limit', async () => {
        user = await usersService.create({
          email: faker.internet.email(),
          graffiti: uuid(),
          countryCode: faker.address.countryCode('alpha-3'),
        });
        redemption = await prisma.redemption.create({
          data: {
            user: { connect: { id: user.id } },
            public_address: 'testingstatuses',
            kyc_status: kycStatus,
          },
        });
        await expect(
          redemptionService.attemptKyc(redemption, prisma),
        ).rejects.toThrow(UnauthorizedException);
      });
      it.each([
        [
          KycStatus.FAIL_MAX_ATTEMPTS,
          new UnauthorizedException('KYC terminal failure'),
        ],
        [KycStatus.PASS, new BadRequestException('KYC has already passed')],
      ])(
        'Redemption with status %p throws %p',
        async (kycStatus: KycStatus, exception: HttpException) => {
          user = await usersService.create({
            email: faker.internet.email(),
            graffiti: uuid(),
            countryCode: faker.address.countryCode('alpha-3'),
          });
          redemption = await prisma.redemption.create({
            data: {
              user: { connect: { id: user.id } },
              public_address: 'testingstatuses',
              dedupe_status: DedupeStatus.NOT_STARTED,
              kyc_status: kycStatus,
            },
          });
          await expect(
            redemptionService.attemptKyc(redemption, prisma),
          ).rejects.toThrow(exception);
        },
      );
    });
  });
});
