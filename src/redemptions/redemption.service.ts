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
  JumioTransactionStandaloneSanction,
  WatchlistScreenCheck,
} from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { IdDetails } from '../jumio-kyc/kyc.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';
import { UsersService } from '../users/users.service';

export const AIRDROP_BANNED_COUNTRIES = ['IRN', 'PRK', 'CUB'];
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
    idDetails: IdDetails[];
    age: number | undefined;
  }> {
    const age =
      Math.min(
        ...transactionStatus.capabilities.extraction.map((extraction) => {
          return Number(extraction.data.currentAge);
        }),
      ) ?? undefined;
    const userId = Number(transactionStatus.workflow.customerInternalReference);
    const labels = this.getTransactionLabels(transactionStatus);
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
        age,
      };
    }
    if (age < 18) {
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
    if (transactionStatus.decision.type === DecisionStatus.PASSED) {
      return {
        status: KycStatus.SUCCESS,
        failureMessage: null,
        idDetails,
        age,
      };
    }
    const watchlistScreeningFailure = this.watchlistScreeningFailure(
      transactionStatus.capabilities.watchlistScreening,
    );
    const repeatedFaceWorkflowIds = this.getRepeatedFaceWorkflowIds(
      transactionStatus.capabilities.imageChecks,
    );
    const multiAccountFailure = await this.multiAccountFailure(
      userId,
      repeatedFaceWorkflowIds,
    );

    // TODO: HANDLE WARN, use decision.risk.score?
    const failure = watchlistScreeningFailure || multiAccountFailure;
    if (failure) {
      return {
        status: KycStatus.FAILED,
        failureMessage: failure,
        idDetails,
        age,
      };
    }
    if (
      !multiAccountFailure &&
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

  // this response will only be a subset of JumioTransactionRetrieveResponse
  calculateStandaloneWatchlistStatus(
    transactionStatus: JumioTransactionStandaloneSanction,
  ): {
    status: KycStatus;
    failureMessage: string | null;
    idDetails: undefined;
    age: undefined;
  } {
    if (
      this.watchlistScreeningFailure(
        transactionStatus.capabilities.watchlistScreening,
      )
    ) {
      return {
        status: KycStatus.FAILED,
        failureMessage: 'Sanction screening failed, ineligible for airdrop.',
        idDetails: undefined,
        age: undefined,
      };
    }
    return {
      status: KycStatus.SUCCESS,
      failureMessage: '',
      idDetails: undefined,
      age: undefined,
    };
  }

  getTransactionLabels(status: JumioTransactionRetrieveResponse): string[] {
    return [
      ...status.capabilities.dataChecks.map((i) => i.decision.details.label),
      ...status.capabilities.extraction.map((i) => i.decision.details.label),
      ...status.capabilities.imageChecks.map((i) => i.decision.details.label),
      ...status.capabilities.liveness.map((i) => i.decision.details.label),
      ...status.capabilities.similarity.map((i) => i.decision.details.label),
      ...status.capabilities.usability.map((i) => i.decision.details.label),
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
        helpUrl: 'https://coda.io/d/_dte_X_jrtqj/KYC-FAQ_su_vf#_luFte',
      };
    }

    if (!user.enable_kyc) {
      return {
        eligible: false,
        reason:
          'KYC will open for your account soon, please be patient and check back later.',
        helpUrl: '',
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
          helpUrl: 'https://coda.io/d/_dte_X_jrtqj/KYC-FAQ_su_vf#_luJAy',
        };
      }

      if (redemption.age && redemption.age < 18) {
        return {
          eligible: true,
          reason: this.minorAgeMessage(redemption.age),
          helpUrl: 'https://coda.io/d/_dte_X_jrtqj/KYC-FAQ_su_vf#_luqdC',
        };
      }

      let hasBannedCountry = null;
      let kycCountries = null;
      if (redemption.id_details) {
        kycCountries = redemption.id_details as Array<{
          id_issuing_country: string;
        }>;
        hasBannedCountry = kycCountries
          .map((c) => this.hasBannedCountry(c.id_issuing_country))
          .some((c) => c);
      }
      if (kycCountries && hasBannedCountry) {
        return {
          eligible: false,
          reason: `A country associated with your KYC attempt is banned: ${kycCountries
            .map((c) => c.id_issuing_country)
            .join(', ')}`,
          helpUrl: '',
        };
      }
    }

    if (this.currentDate() > KYC_DEADLINE) {
      return {
        eligible: false,
        reason: `Your final deadline for kyc has passed: ${KYC_DEADLINE.toUTCString()}`,
        helpUrl: '',
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
        helpUrl: '',
      };
    }

    if (this.hasBannedCountry(user.country_code)) {
      return {
        eligible: false,
        reason: `The country associated with your graffiti is banned: ${user.country_code}`,
        helpUrl: '',
      };
    }

    const transaction = await this.jumioTransactionService.findLatest(user);
    const transactionStatus = transaction
      ? (transaction.last_workflow_fetch as unknown as JumioTransactionRetrieveResponse)
      : null;

    const watchlistScreeningFailure = transactionStatus
      ? this.watchlistScreeningFailure(
          transactionStatus.capabilities.watchlistScreening,
        )
      : null;
    if (watchlistScreeningFailure) {
      return {
        eligible: false,
        reason: watchlistScreeningFailure,
        helpUrl: 'https://coda.io/d/_dte_X_jrtqj/KYC-FAQ_su_vf#_luOvv',
      };
    }

    const repeatedFaceWorkflowIds = transactionStatus
      ? this.getRepeatedFaceWorkflowIds(
          transactionStatus.capabilities.imageChecks,
        )
      : null;
    if (repeatedFaceWorkflowIds) {
      const transactions = await this.jumioTransactionService.findByWorkflowIds(
        repeatedFaceWorkflowIds,
      );
      const users = await this.usersService.findManyById(
        transactions.map((t) => t.user_id),
      );
      const graffitis = users.map((u) => u.graffiti);
      return {
        eligible: false,
        reason: `You cannot KYC for more than one account. 
        You have completed KYC with other graffitis${
          graffitis ? ': ' + graffitis.join(', ') : ''
        }`,
        helpUrl: '',
      };
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
