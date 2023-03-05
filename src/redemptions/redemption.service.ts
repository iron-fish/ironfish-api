/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DecisionStatus, KycStatus, Redemption, User } from '@prisma/client';
import { instanceToPlain } from 'class-transformer';
import { ApiConfigService } from '../api-config/api-config.service';
import { JumioTransactionRetrieveResponse } from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { IdDetails } from '../jumio-kyc/kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';

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

  calculateStatus(transactionStatus: JumioTransactionRetrieveResponse): {
    status: KycStatus;
    failureMessage: string | null;
    idDetails: IdDetails[];
  } {
    // deal with banned countries
    const idDetails: IdDetails[] =
      transactionStatus.capabilities.extraction.map((extraction) => {
        return {
          id_issuing_country: extraction.data.issuingCountry,
          id_subtype: extraction.data.subType,
          id_type: extraction.data.type,
        };
      });
    const banned = idDetails
      .map((detail) => detail.id_issuing_country)
      .map(this.hasBannedCountry)
      .filter((i) => i);

    if (banned.length) {
      return {
        status: KycStatus.FAILED,
        failureMessage: 'Failure: Banned Country',
        idDetails,
      };
    }
    if (
      transactionStatus.workflow.status === 'SESSION_EXPIRED' ||
      transactionStatus.workflow.status === 'TOKEN_EXPIRED' ||
      transactionStatus.decision.type === DecisionStatus.NOT_EXECUTED
    ) {
      return {
        status: KycStatus.TRY_AGAIN,
        failureMessage: null,
        idDetails,
      };
    }
    if (transactionStatus.decision.type === DecisionStatus.PASSED) {
      return {
        status: KycStatus.SUBMITTED,
        failureMessage: null,
        idDetails,
      };
    }
    // TODO: HANDLE WARN, use decision.risk.score?
    const failure =
      this.livenessStatus(transactionStatus) ||
      this.similarityStatus(transactionStatus) ||
      this.dataChecksStatus(transactionStatus) ||
      this.extractionStatus(transactionStatus) ||
      this.usabilityStatus(transactionStatus);
    if (failure) {
      return {
        status: KycStatus.FAILED,
        failureMessage: failure,
        idDetails,
      };
    }

    return {
      status: KycStatus.TRY_AGAIN,
      failureMessage: null,
      idDetails,
    };
  }

  similarityStatus(_response: JumioTransactionRetrieveResponse): string | null {
    return null;
  }

  livenessStatus(response: JumioTransactionRetrieveResponse): string | null {
    for (const check of response.capabilities.liveness) {
      if (
        ['PHOTOCOPY', 'DIGITAL_COPY', 'MANIPULATED', 'BLACK_WHITE'].includes(
          check.decision.details.label,
        )
      ) {
        return `Liveness check failed: ${check.decision.details.label}`;
      }
    }

    return null;
  }

  dataChecksStatus(_response: JumioTransactionRetrieveResponse): string | null {
    return null;
  }

  extractionStatus(_response: JumioTransactionRetrieveResponse): string | null {
    return null;
  }

  usabilityStatus(response: JumioTransactionRetrieveResponse): string | null {
    for (const check of response.capabilities.usability) {
      if (
        check.decision.details.label === 'PHOTOCOPY' ||
        check.decision.details.label === 'BLACK_WHITE'
      ) {
        return `Usability check failed: ${check.decision.details.label}`;
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
      kycStatus: KycStatus;
      jumioAccountId?: string;
      idDetails?: IdDetails[];
      failureMessage?: string;
    },
    prisma?: BasePrismaClient,
  ): Promise<Redemption> {
    const client = prisma ?? this.prisma;

    return client.redemption.update({
      data: {
        kyc_status: data.kycStatus,
        jumio_account_id: data.jumioAccountId,
        id_details: instanceToPlain(data.idDetails),
        failure_message: data.failureMessage,
      },
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

  async isEligible(
    user: User,
    redemption?: Redemption | null,
    prisma?: BasePrismaClient,
  ): Promise<{ eligible: boolean; reason: string }> {
    if (!user.enable_kyc) {
      return { eligible: false, reason: 'KYC not enabled on user' };
    }

    if (redemption) {
      const kycMaxAttempts =
        redemption.kyc_max_attempts ??
        this.config.get<number>('KYC_MAX_ATTEMPTS');

      if (redemption.kyc_attempts >= kycMaxAttempts) {
        return {
          eligible: false,
          reason: `Max attempts reached ${redemption.kyc_attempts} / ${kycMaxAttempts}`,
        };
      }
    }

    const points = await this.userPointsService.findOrThrow(user.id, prisma);

    const hasPoints =
      points.pool1_points ||
      points.pool2_points ||
      points.pool3_points ||
      points.pool4_points;

    if (!hasPoints) {
      return { eligible: false, reason: 'User has no points' };
    }

    if (this.hasBannedCountry(user.country_code)) {
      return {
        eligible: false,
        reason: `User is from a banned country: ${user.country_code}`,
      };
    }

    return { eligible: true, reason: '' };
  }

  hasBannedCountry = (country_code: string): boolean =>
    this.config
      .get<string>('REDEMPTION_BAN_LIST')
      .split(',')
      .map((c) => c.trim())
      .includes(country_code);

  async canAttempt(
    redemption: Redemption | null,
    user: User,
    prisma?: BasePrismaClient,
  ): Promise<{ attemptable: boolean; reason: string }> {
    const { eligible, reason } = await this.isEligible(
      user,
      redemption,
      prisma,
    );

    if (!eligible) {
      return { attemptable: false, reason };
    }

    if (redemption) {
      if (redemption.kyc_status !== KycStatus.TRY_AGAIN) {
        return {
          attemptable: false,
          reason: `Redemption status is not TRY_AGAIN: ${redemption.kyc_status}`,
        };
      }
    }

    return { attemptable: true, reason: '' };
  }
}
