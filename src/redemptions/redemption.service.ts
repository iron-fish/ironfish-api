/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DecisionStatus, KycStatus, Redemption, User } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { JumioTransactionRetrieveResponse } from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';

export const REDEMPTION_BAN_LIST = ['PRK', 'IRN'];
@Injectable()
export class RedemptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPointsService: UserPointsService,
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
    return this.prisma.redemption.findFirst({
      where: { user: { id: user.id } },
    });
  }

  calculateStatus(
    transactionStatus: JumioTransactionRetrieveResponse,
  ): KycStatus {
    if (
      ['SESSION_EXPIRED', 'TOKEN_EXPIRED'].includes(
        transactionStatus.workflow.status,
      )
    ) {
      return KycStatus.TRY_AGAIN;
    }
    if (transactionStatus.decision.type === DecisionStatus.NOT_EXECUTED) {
      return KycStatus.TRY_AGAIN;
    }
    if (transactionStatus.decision.type === DecisionStatus.PASSED) {
      return KycStatus.SUBMITTED;
    }
    // TODO: HANDLE WARN, use decision.risk.score?
    const failure =
      this.livenessStatus(transactionStatus) ||
      this.similarityStatus(transactionStatus) ||
      this.dataChecksStatus(transactionStatus) ||
      this.extractionStatus(transactionStatus) ||
      this.usabilityStatus(transactionStatus);
    if (failure) {
      return failure;
    }

    return KycStatus.TRY_AGAIN;
  }

  similarityStatus(
    _response: JumioTransactionRetrieveResponse,
  ): KycStatus | null {
    return null;
  }

  livenessStatus(response: JumioTransactionRetrieveResponse): KycStatus | null {
    for (const check of response.capabilities.liveness) {
      // hard fail
      if (
        ['PHOTOCOPY', 'DIGITAL_COPY', 'MANIPULATED', 'BLACK_WHITE'].includes(
          check.decision.details.label,
        )
      ) {
        return KycStatus.FAILED;
      }
    }

    return null;
  }

  dataChecksStatus(
    _response: JumioTransactionRetrieveResponse,
  ): KycStatus | null {
    return null;
  }

  extractionStatus(
    _response: JumioTransactionRetrieveResponse,
  ): KycStatus | null {
    return null;
  }

  usabilityStatus(
    response: JumioTransactionRetrieveResponse,
  ): KycStatus | null {
    for (const check of response.capabilities.usability) {
      if (
        check.decision.details.label === 'PHOTOCOPY' ||
        check.decision.details.label === 'BLACK_WHITE'
      ) {
        return KycStatus.FAILED;
      }
    }
    return null;
  }

  async findByJumioAccountId(jumioAccountId: string): Promise<Redemption> {
    return this.prisma.redemption.findFirstOrThrow({
      where: { jumio_account_id: jumioAccountId },
    });
  }

  async update(
    redemption: Redemption,
    data: {
      kyc_status: KycStatus;
      jumio_account_id?: string;
    },
    prisma?: BasePrismaClient,
  ): Promise<Redemption> {
    const client = prisma ?? this.prisma;

    return client.redemption.update({
      data: data,
      where: {
        id: redemption.id,
      },
    });
  }

  async incrementAttempts(
    redemption: Redemption,
    prisma?: BasePrismaClient,
  ): Promise<Redemption> {
    const client = prisma ?? this.prisma;

    return client.redemption.update({
      data: {
        kyc_attempts: {
          increment: 1,
        },
      },
      where: {
        id: redemption.id,
      },
    });
  }

  async create(
    user: User,
    public_address: string,
    prisma?: BasePrismaClient,
  ): Promise<Redemption> {
    const client = prisma ?? this.prisma;

    return client.redemption.create({
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
  ): Promise<string | null> {
    if (!user.enable_kyc) {
      return 'KYC not enabled on user';
    }

    const points = await this.userPointsService.findOrThrow(user.id, prisma);

    const hasPoints =
      points.pool1_points ||
      points.pool2_points ||
      points.pool3_points ||
      points.pool4_points;

    if (!hasPoints) {
      return 'User has no points';
    }

    if (REDEMPTION_BAN_LIST.includes(user.country_code)) {
      return `User is from a banned country: ${user.country_code}`;
    }

    if (redemption) {
      const kycMaxAttempts = this.config.get<number>('KYC_MAX_ATTEMPTS');

      if (redemption.kyc_attempts >= kycMaxAttempts) {
        return `Max attempts reached ${redemption.kyc_attempts} / ${kycMaxAttempts}`;
      }

      if (redemption.kyc_status !== KycStatus.TRY_AGAIN) {
        return `Redemption status is not TRY_AGAIN: ${redemption.kyc_status}`;
      }
    }

    return null;
  }
}
