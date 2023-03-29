/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DecisionStatus, KycStatus, Redemption, User } from '@prisma/client';
import assert from 'assert';
import { instanceToPlain } from 'class-transformer';
import { createHash } from 'crypto';
import { ApiConfigService } from '../api-config/api-config.service';
import { KYC_DEADLINE } from '../common/constants';
import {
  DataChecksLabel,
  ExtractionLabel,
  ImageCheck,
  ImageChecksLabel,
  JumioTransactionRetrieveResponse,
  LivenessLabel,
  SimilarityLabel,
  UsabilityLabel,
  WatchlistScreenCheck,
  WatchlistScreeningLabels,
} from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { IdDetails } from '../jumio-kyc/kyc.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';
import { UsersService } from '../users/users.service';

export const AIRDROP_BANNED_COUNTRIES = ['IRN', 'PRK', 'CUB'];

export const HELP_URLS = {
  USER_BANNED: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_luVT4',
  MAX_ATTEMPTS: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_luQTU',
  MIN_AGE: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_luTf-',
  WATCHLIST: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lur0O',
  EXPIRED: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_luMjq',
  DOC_MISSING_DATA_POINTS:
    'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_luCoT',
  DOC_BLURRED: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_luO9-',
  DOC_PHOTOCOPY: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lu6j-',
  DOC_UNSUPPORTED: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lui5e',
  DOC_GLARE: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lu9Ae',
  DOC_MISSING_SIGNATURE:
    'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_luu2r',
  DOC_BAD_QUALITY: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lul9P',
  ENABLE_KYC: '',
  BANNED_COUNTRY_ID: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lufLy',
  BANNED_COUNTRY_GRAFFITI:
    'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lu-9p',
  DEADLINE: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_ludCK',
  NO_POINTS: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lu1kK',
  REPEATED_FACE: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_lu2o3',
  UNKNOWN: 'https://coda.io/d/_dte_X_jrtqj/Fail-Reasons_sucnO#_luysd',
};

const USABILITY_ERRORS = new Map<
  UsabilityLabel,
  { message: string; url: string }
>([
  [
    'MISSING_MANDATORY_DATAPOINTS',
    {
      message: 'Your ID is missing information.',
      url: HELP_URLS.DOC_MISSING_DATA_POINTS,
    },
  ],
  [
    'BLURRED',
    {
      message: 'Your ID is blurry.',
      url: HELP_URLS.DOC_BLURRED,
    },
  ],
  [
    'GLARE',
    {
      message: 'Your ID has a glare.',
      url: HELP_URLS.DOC_GLARE,
    },
  ],
  [
    'BAD_QUALITY',
    {
      message: 'Your photo is bad quality.',
      url: HELP_URLS.DOC_BAD_QUALITY,
    },
  ],
  [
    'MISSING_SIGNATURE',
    {
      message: 'Your ID is missing a signature.',
      url: HELP_URLS.DOC_MISSING_SIGNATURE,
    },
  ],
  [
    'GLARE',
    {
      message: 'Your ID looks like a photocopy.',
      url: HELP_URLS.DOC_PHOTOCOPY,
    },
  ],
  [
    'UNSUPPORTED_DOCUMENT_TYPE',
    {
      message: 'Your ID is not supported.',
      url: HELP_URLS.DOC_UNSUPPORTED,
    },
  ],
]);

export const BENIGN_FAILURES: ApprovedLabelSet[] = [
  {
    maxRiskScore: 50,
    usabilityLabels: ['NOT_UPLOADED', 'LIVENESS_UNDETERMINED', 'OK'],
    livenessLabels: ['BAD_QUALITY', 'OK'],
  },
];

export type ApprovedLabelSet = {
  maxRiskScore: number;
  similarityLabels?: SimilarityLabel[];
  dataChecksLabels?: DataChecksLabel[];
  extractionLabels?: ExtractionLabel[];
  usabilityLabels?: UsabilityLabel[];
  imageChecksLabels?: ImageChecksLabel[];
  watchlistScreeningLabels?: WatchlistScreeningLabels[];
  livenessLabels?: LivenessLabel[];
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

  async findRedeemable(): Promise<Redemption[]> {
    return this.prisma.redemption.findMany({
      where: { kyc_status: KycStatus.SUCCESS },
    });
  }

  async calculateStatus(
    transactionStatus: JumioTransactionRetrieveResponse,
  ): Promise<{
    status: KycStatus;
    failureUrl: string | null;
    failureMessage: string | null;
    idDetails: IdDetails[] | undefined;
    age: number | undefined;
  }> {
    let age = undefined;
    let idDetails: IdDetails[] | undefined = undefined;

    if (transactionStatus.capabilities.extraction) {
      age =
        Math.min(
          ...transactionStatus.capabilities.extraction.map((extraction) => {
            return Number(extraction.data.currentAge);
          }),
        ) || undefined;

      const ids = transactionStatus.capabilities.extraction
        .filter((e) => e.data.issuingCountry && e.data.subType && e.data.type)
        .map((e) => {
          assert.ok(e.data.issuingCountry);
          assert.ok(e.data.subType);
          assert.ok(e.data.type);

          return {
            id_issuing_country: e.data.issuingCountry,
            id_subtype: e.data.subType,
            id_type: e.data.type,
          };
        });

      if (ids.length) {
        idDetails = ids;
      }
    }

    const userId = Number(transactionStatus.workflow.customerInternalReference);
    const labels = this.getTransactionLabels(transactionStatus);

    if (idDetails) {
      // deal with banned countries
      const banned = idDetails.find(
        (detail) =>
          detail.id_issuing_country &&
          this.hasBannedCountry(detail.id_issuing_country),
      );

      if (banned) {
        assert.ok(banned.id_issuing_country);
        return {
          status: KycStatus.FAILED,
          failureUrl: HELP_URLS.BANNED_COUNTRY_ID,
          failureMessage: `Your country is banned ${banned.id_issuing_country}.`,
          idDetails,
          age,
        };
      }
    }

    if (age && age < 18) {
      return {
        status: KycStatus.TRY_AGAIN,
        failureUrl: HELP_URLS.MIN_AGE,
        failureMessage: `You must be 18 years old. You are ${age} years old.`,
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
        failureUrl: HELP_URLS.EXPIRED,
        failureMessage: `Time limit of 15 minutes.`,
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
          failureUrl: HELP_URLS.WATCHLIST,
          failureMessage: 'You are on the United States OFAC sanction list.',
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
        // If multiple accounts are found, ban the current user for scamming
        return {
          status: KycStatus.FAILED,
          failureUrl: HELP_URLS.REPEATED_FACE,
          failureMessage: multiAccountFailure,
          idDetails,
          age,
        };
      }
    }

    if (transactionStatus.capabilities.usability) {
      const rejected = transactionStatus.capabilities.usability.find(
        (u) => u.decision.type === 'REJECTED' || u.decision.type === 'WARNING',
      );

      if (rejected) {
        const error = USABILITY_ERRORS.get(rejected.decision.details.label);

        if (error) {
          return {
            status: KycStatus.TRY_AGAIN,
            failureUrl: error.url,
            failureMessage: error.message,
            idDetails,
            age,
          };
        }
      }
    }

    if (transactionStatus.decision.type === DecisionStatus.PASSED) {
      return {
        status: KycStatus.SUCCESS,
        failureMessage: null,
        failureUrl: null,
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
        failureUrl: null,
        failureMessage: `Benign warning labels found: ${labels.join(',')}`,
        idDetails,
        age,
      };
    }
    const matchedApproval = this.matchApprovedLabels(transactionStatus);
    if (matchedApproval) {
      return {
        status: KycStatus.SUCCESS,
        failureUrl: null,
        failureMessage: null,
        idDetails,
        age,
      };
    }
    return {
      status: KycStatus.TRY_AGAIN,
      failureUrl: HELP_URLS.UNKNOWN,
      failureMessage: 'You have failed for an unknown reason.',
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

      if (imageCheck.data?.faceSearchFindings.findings !== undefined) {
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

    for (const foundWorkflow of foundWorkflows) {
      if (foundWorkflow.user_id !== userId) {
        return `You have already attempted KYC for another graffiti (${foundWorkflow.user_id}).`;
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
      pool_one?: bigint;
      pool_two?: bigint;
      pool_three?: bigint;
      pool_four?: bigint;
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
        pool_one: data.pool_one,
        pool_two: data.pool_two,
        pool_three: data.pool_three,
        pool_four: data.pool_four,
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
            helpUrl: HELP_URLS.BANNED_COUNTRY_ID,
          };
        }
      }
    }

    if (this.currentDate() > KYC_DEADLINE) {
      return {
        eligible: false,
        reason: `Your final deadline for kyc has passed: ${KYC_DEADLINE.toUTCString()}.`,
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
        reason: 'Your account has no points.',
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

  matchApprovedLabels(status: JumioTransactionRetrieveResponse): boolean {
    const approvals = BENIGN_FAILURES.map((approvedLabelSet) =>
      this.matchApproveLabelSet(status, approvedLabelSet),
    ).filter((a) => a);

    return approvals.length > 0 ? true : false;
  }

  matchApproveLabelSet(
    status: JumioTransactionRetrieveResponse,
    {
      maxRiskScore,
      dataChecksLabels = ['OK'],
      extractionLabels = ['OK'],
      imageChecksLabels = ['OK', 'REPEATED_FACE'],
      livenessLabels = ['OK'],
      similarityLabels = ['MATCH'],
      usabilityLabels = ['OK'],
      watchlistScreeningLabels = ['OK'],
    }: ApprovedLabelSet,
  ): boolean {
    if (status.decision.risk.score > maxRiskScore) {
      return false;
    }
    if (
      !status.capabilities.dataChecks?.every((c) =>
        dataChecksLabels.includes(c.decision.details.label),
      ) ||
      !status.capabilities.extraction?.every((c) =>
        extractionLabels.includes(c.decision.details.label),
      ) ||
      !status.capabilities.imageChecks?.every((c) =>
        imageChecksLabels.includes(c.decision.details.label),
      ) ||
      !status.capabilities.liveness?.every((c) =>
        livenessLabels.includes(c.decision.details.label),
      ) ||
      !status.capabilities.similarity?.every((c) =>
        similarityLabels.includes(c.decision.details.label),
      ) ||
      !status.capabilities.usability?.every((c) =>
        usabilityLabels.includes(c.decision.details.label),
      ) ||
      !status.capabilities.watchlistScreening?.every((c) =>
        watchlistScreeningLabels.includes(c.decision.details.label),
      )
    ) {
      return false;
    }
    return true;
  }
}
