/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DecisionStatus, KycStatus, Redemption, User } from '@prisma/client';
import { instanceToPlain } from 'class-transformer';
import { createHash } from 'crypto';
import { ApiConfigService } from '../api-config/api-config.service';
import { KYC_DEADLINE } from '../common/constants';
import {
  ImageCheck,
  JumioTransactionRetrieveResponse,
  WatchlistScreenCheck,
} from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { IdDetails } from '../jumio-kyc/kyc.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';
import { UsersService } from '../users/users.service';

export const AIRDROP_BANNED_COUNTRIES = ['IRN', 'PRK', 'CUB'];

export const HELP_URLS = {
  USER_BANNED: 'https://coda.io/d/_dte_X_jrtqj/KYC-FAQ_su_vf#_luFte',
  MAX_ATTEMPTS: 'https://coda.io/d/_dte_X_jrtqj/KYC-FAQ_su_vf#_luJAy',
  MIN_AGE: 'https://coda.io/d/_dte_X_jrtqj/KYC-FAQ_su_vf#_luqdC',
  WATCHLIST: 'https://coda.io/d/_dte_X_jrtqj/KYC-FAQ_su_vf#_luOvv',
  ENABLE_KYC: '',
  BANNED_COUNRTY_ID: '',
  BANNED_COUNTRY_GRAFFITI: '',
  DEADLINE: '',
  NO_POINTS: '',
  REPEATED_FACE: '',
};

@Injectable()
export class RedemptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPointsService: UserPointsService,
    private readonly jumioTransactionService: JumioTransactionService,
    private readonly config: ApiConfigService,
    private readonly usersService: UsersService,
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

  async calculateStatus(
    transactionStatus: JumioTransactionRetrieveResponse,
  ): Promise<{
    status: KycStatus;
    failureMessage: string | null;
    idDetails: IdDetails[] | undefined;
    age: number | undefined;
  }> {
    let age = undefined;
    let idDetails: IdDetails[] | undefined = undefined;

    if (transactionStatus.capabilities.extraction) {
      age = Math.min(
        ...transactionStatus.capabilities.extraction.map((extraction) => {
          return Number(extraction.data.currentAge);
        }),
      );

      idDetails = transactionStatus.capabilities.extraction.map((e) => ({
        id_issuing_country: e.data.issuingCountry,
        id_subtype: e.data.subType,
        id_type: e.data.type,
      }));
    }

    const userId = Number(transactionStatus.workflow.customerInternalReference);
    const labels = this.getTransactionLabels(transactionStatus);

    if (idDetails) {
      // deal with banned countries
      const banned = idDetails.find((detail) =>
        this.hasBannedCountry(detail.id_issuing_country),
      );

      if (banned) {
        return {
          status: KycStatus.FAILED,
          failureMessage: 'Failure: Banned Country',
          idDetails,
          age,
        };
      }
    }

    if (age && age < 18) {
      return {
        status: KycStatus.TRY_AGAIN,
        failureMessage: this.minorAgeMessage(age),
        idDetails,
        age,
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
        age,
      };
    }

    if (transactionStatus.capabilities.watchlistScreening) {
      const watchlistScreeningFailure = this.watchlistScreeningFailure(
        transactionStatus.capabilities.watchlistScreening,
      );

      if (watchlistScreeningFailure) {
        return {
          status: KycStatus.FAILED,
          failureMessage: watchlistScreeningFailure,
          idDetails,
          age,
        };
      }
    }

    if (transactionStatus.capabilities.imageChecks) {
      const repeatedFaceWorkflowIds = this.getRepeatedFaceWorkflowIds(
        transactionStatus.capabilities.imageChecks,
      );

      const multiAccountFailure = await this.multiAccountFailure(
        userId,
        repeatedFaceWorkflowIds,
      );

      if (multiAccountFailure) {
        return {
          status: KycStatus.FAILED,
          failureMessage: multiAccountFailure,
          idDetails,
          age,
        };
      }
    }

    if (transactionStatus.decision.type === DecisionStatus.PASSED) {
      return {
        status: KycStatus.SUCCESS,
        failureMessage: null,
        idDetails,
        age,
      };
    }

    if (
      this.hasOnlyBenignWarnings(labels) &&
      transactionStatus.decision.risk.score < 50
    ) {
      return {
        status: KycStatus.SUCCESS,
        failureMessage: `Benign warning labels found: ${labels.join(',')}`,
        idDetails,
        age,
      };
    }

    return {
      status: KycStatus.TRY_AGAIN,
      failureMessage: null,
      idDetails,
      age,
    };
  }

  getTransactionLabels(status: JumioTransactionRetrieveResponse): string[] {
    const capabilities = status.capabilities;

    return [
      ...(capabilities.dataChecks?.map((i) => i.decision.details.label) ?? []),
      ...(capabilities.extraction?.map((i) => i.decision.details.label) ?? []),
      ...(capabilities.imageChecks?.map((i) => i.decision.details.label) ?? []),
      ...(capabilities.liveness?.map((i) => i.decision.details.label) ?? []),
      ...(capabilities.similarity?.map((i) => i.decision.details.label) ?? []),
      ...(capabilities.usability?.map((i) => i.decision.details.label) ?? []),
    ];
  }

  watchlistScreeningFailure(
    watchlistChecks: WatchlistScreenCheck[],
  ): string | null {
    for (const watchlistCheck of watchlistChecks) {
      if (watchlistCheck.decision.details.label === 'ALERT') {
        return 'Watchlist screening failed, you are ineligble for airdrop';
      }
    }
    return null;
  }

  getRepeatedFaceWorkflowIds(imageChecks: ImageCheck[]): string[] {
    // for imageChecks, only duplicate face should pass
    let repeatedFaceWorkflowIds: string[] = [];

    for (const imageCheck of imageChecks) {
      if (imageCheck.decision.details.label !== 'REPEATED_FACE') {
        continue;
      }

      if (imageCheck.data.faceSearchFindings.findings !== undefined) {
        repeatedFaceWorkflowIds = repeatedFaceWorkflowIds.concat(
          imageCheck.data.faceSearchFindings.findings,
        );
      }
    }

    return repeatedFaceWorkflowIds;
  }

  async multiAccountFailure(
    userId: number,
    repeatedFaceWorkflowIds: string[],
  ): Promise<string | null> {
    if (!repeatedFaceWorkflowIds.length) {
      return null;
    }
    // lookup workflows returned as matching
    const foundWorkflows = await this.jumioTransactionService.findByWorkflowIds(
      repeatedFaceWorkflowIds,
    );

    // If any are found and don't match current user, ban the current user for scamming
    for (const foundWorkflow of foundWorkflows) {
      if (foundWorkflow.user_id !== userId) {
        return `User with multiple accounts detected (alternate user id=${foundWorkflow.user_id} , current user id=${userId}), this transaction matches face from different account in transaction_id=${foundWorkflow.workflow_execution_id}`;
      }
    }
    return null;
  }

  hasOnlyBenignWarnings(labels: string[]): boolean {
    // if any other check failed, we can't pass
    for (const label of labels) {
      if (
        !['MATCH', 'REPEATED_FACE', 'LIVENESS_UNDETERMINED', 'OK'].includes(
          label,
        )
      ) {
        return false;
      }
    }
    return true;
  }

  async findByJumioAccountId(jumioAccountId: string): Promise<Redemption> {
    return this.prisma.redemption.findFirstOrThrow({
      where: { jumio_account_id: jumioAccountId },
    });
  }

  async update(
    redemption: Redemption,
    data: {
      kycStatus?: KycStatus;
      jumioAccountId?: string;
      idDetails?: IdDetails[];
      failureMessage?: string;
      publicAddress?: string;
      age?: number;
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
        public_address: data.publicAddress,
        ...(data.age ? { age: data.age } : {}),
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
    ipAddress: string,
    prisma?: BasePrismaClient,
  ): Promise<Redemption> {
    const hash = createHash('sha256');
    hash.update(ipAddress);
    hash.end();
    const client = prisma ?? this.prisma;

    return client.redemption.create({
      data: {
        user: { connect: { id: user.id } },
        public_address,
        kyc_status: KycStatus.IN_PROGRESS,
        hashed_ip_address: hash.digest().toString('hex'),
      },
    });
  }

  async isEligible(
    user: User,
    redemption?: Redemption | null,
    prisma?: BasePrismaClient,
  ): Promise<{ eligible: boolean; reason: string; helpUrl: string }> {
    if (
      redemption &&
      (redemption.kyc_status === KycStatus.SUBMITTED ||
        redemption.kyc_status === KycStatus.SUCCESS)
    ) {
      return { eligible: true, reason: '', helpUrl: '' };
    }

    if (user.ineligible_reason) {
      return {
        eligible: false,
        reason: user.ineligible_reason,
        helpUrl: HELP_URLS.USER_BANNED,
      };
    }

    if (!user.enable_kyc) {
      return {
        eligible: false,
        reason:
          'KYC will open for your account soon, please be patient and check back later.',
        helpUrl: HELP_URLS.ENABLE_KYC,
      };
    }

    if (redemption) {
      const kycMaxAttempts =
        redemption.kyc_max_attempts ??
        this.config.get<number>('KYC_MAX_ATTEMPTS');

      if (redemption.kyc_attempts >= kycMaxAttempts) {
        return {
          eligible: false,
          reason: `Max KYC attempts reached ${redemption.kyc_attempts} / ${kycMaxAttempts}`,
          helpUrl: HELP_URLS.MAX_ATTEMPTS,
        };
      }

      if (redemption.age && redemption.age < 18) {
        return {
          eligible: true,
          reason: this.minorAgeMessage(redemption.age),
          helpUrl: HELP_URLS.MIN_AGE,
        };
      }

      if (redemption.id_details) {
        const kycCountries = redemption.id_details as Array<{
          id_issuing_country: string;
        }>;

        const hasBannedCountry = kycCountries
          .map((c) => this.hasBannedCountry(c.id_issuing_country))
          .some((c) => c);

        if (kycCountries && hasBannedCountry) {
          const reason = `A country associated with your KYC attempt is banned: ${kycCountries
            .map((c) => c.id_issuing_country)
            .join(', ')}`;

          return {
            eligible: false,
            reason,
            helpUrl: HELP_URLS.BANNED_COUNRTY_ID,
          };
        }
      }
    }

    if (this.currentDate() > KYC_DEADLINE) {
      return {
        eligible: false,
        reason: `Your final deadline for kyc has passed: ${KYC_DEADLINE.toUTCString()}`,
        helpUrl: HELP_URLS.DEADLINE,
      };
    }

    const points = await this.userPointsService.findOrThrow(user.id, prisma);

    const hasPoints =
      points.pool1_points ||
      points.pool2_points ||
      points.pool3_points ||
      points.pool4_points;

    if (!hasPoints) {
      return {
        eligible: false,
        reason: 'Your account has no points, you are not eligible for airdrop',
        helpUrl: HELP_URLS.NO_POINTS,
      };
    }

    if (this.hasBannedCountry(user.country_code)) {
      return {
        eligible: false,
        reason: `The country associated with your graffiti is banned: ${user.country_code}`,
        helpUrl: HELP_URLS.BANNED_COUNTRY_GRAFFITI,
      };
    }

    const transaction = await this.jumioTransactionService.findLatest(user);

    if (transaction) {
      const transactionStatus =
        transaction.last_workflow_fetch as unknown as JumioTransactionRetrieveResponse;

      if (transactionStatus) {
        if (transactionStatus.capabilities.watchlistScreening) {
          const watchlistScreeningFailure = this.watchlistScreeningFailure(
            transactionStatus.capabilities.watchlistScreening,
          );

          if (watchlistScreeningFailure) {
            return {
              eligible: false,
              reason: watchlistScreeningFailure,
              helpUrl: HELP_URLS.WATCHLIST,
            };
          }
        }

        if (transactionStatus.capabilities.imageChecks) {
          const repeatedFaceWorkflowIds = this.getRepeatedFaceWorkflowIds(
            transactionStatus.capabilities.imageChecks,
          );

          const multiAccountFailure = await this.multiAccountFailure(
            user.id,
            repeatedFaceWorkflowIds,
          );

          if (multiAccountFailure) {
            return {
              eligible: false,
              reason: 'You cannot KYC for more than one account.',
              helpUrl: HELP_URLS.REPEATED_FACE,
            };
          }
        }
      }
    }

    return { eligible: true, reason: '', helpUrl: '' };
  }

  currentDate(): Date {
    return new Date();
  }

  hasBannedCountry = (country_code: string): boolean =>
    AIRDROP_BANNED_COUNTRIES.includes(country_code);

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

  minorAgeMessage = (age: number): string =>
    `You must be 18 years old. You are ${age} years old.`;
}
