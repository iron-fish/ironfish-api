/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus, Redemption, User } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';

@Injectable()
export class RedemptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ApiConfigService,
  ) {}

  async findOrThrow(user: User): Promise<Redemption> {
    const redemption = await this.find(user);
    if (!redemption) {
      throw new NotFoundException('Redemption for user not found');
    }
    return redemption;
  }

  async find(user: User): Promise<Redemption | null> {
    return await this.prisma.redemption.findFirst({
      where: { user: { id: user.id } },
    });
  }

  async addJumioAccountId(
    user: User,
    jumioAccountId: string,
    prisma: BasePrismaClient,
  ): Promise<Redemption> {
    return prisma.redemption.update({
      data: {
        jumio_account_id: jumioAccountId,
      },
      where: {
        user_id: user.id,
      },
    });
  }

  async create(user: User, public_address: string): Promise<Redemption> {
    return await this.prisma.redemption.create({
      data: {
        user: { connect: { id: user.id } },
        public_address,
        kyc_status: KycStatus.NOT_STARTED,
      },
    });
  }

  async attemptKyc(
    redemption: Redemption,
    prisma: BasePrismaClient,
  ): Promise<Redemption> {
    const maxKyc = this.config.get<number>('MAX_KYC_ATTEMPTS');
    if (
      redemption.kyc_attempts >= maxKyc ||
      redemption.kyc_status === KycStatus.FAIL_MAX_ATTEMPTS
    ) {
      throw new BadRequestException('KYC terminal failure');
    }
    if (redemption.kyc_status === KycStatus.PASS) {
      throw new BadRequestException('KYC has already passed');
    }
    return prisma.redemption.update({
      data: {
        kyc_status: KycStatus.PENDING,
        kyc_attempts: {
          increment: 1,
        },
      },
      where: {
        id: redemption.id,
      },
    });
  }
}
