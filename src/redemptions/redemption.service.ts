/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { KycStatus, Redemption, User } from '@prisma/client';
import { KYC_MAX_ATTEMPTS } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';

@Injectable()
export class RedemptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPointsService: UserPointsService,
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

  async update(
    redemption: Redemption,
    data: { kyc_status: KycStatus; jumio_account_id?: string },
  ): Promise<Redemption> {
    return this.prisma.redemption.update({
      data: {
        ...data,
        kyc_attempts: {
          increment: 1,
        },
      },
      where: {
        id: redemption.id,
      },
    });
  }

  async create(user: User, public_address: string): Promise<Redemption> {
    return await this.prisma.redemption.create({
      data: {
        user: { connect: { id: user.id } },
        public_address,
        kyc_status: KycStatus.IN_PROGRESS,
      },
    });
  }

  async canAttempt(
    redemption: Redemption | null,
    user: User,
    prisma?: BasePrismaClient,
  ): Promise<boolean> {
    const points = await this.userPointsService.findOrThrow(user.id, prisma);

    if (points.total_points === 0) {
      return false;
    }

    if (!redemption) {
      return true;
    }

    if (redemption.kyc_attempts >= KYC_MAX_ATTEMPTS) {
      return false;
    }

    return redemption.kyc_status === KycStatus.TRY_AGAIN;
  }
}
