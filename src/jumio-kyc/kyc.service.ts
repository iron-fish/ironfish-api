/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JumioTransaction, KycStatus, Redemption, User } from '@prisma/client';
import assert from 'assert';
import crypto from 'crypto';
import { ApiConfigService } from '../api-config/api-config.service';
import {
  AIRDROP_CONFIG,
  ORE_TO_IRON,
  POOL1_TOKENS,
  POOL2_TOKENS,
  POOL3_TOKENS,
  POOL4_TOKENS,
} from '../common/constants';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { UserPointsService } from '../user-points/user-points.service';
import { UsersService } from '../users/users.service';
import { JumioCallbackData } from './interfaces/jumio-callback-data';
import { Pool } from './types/pools';

export type IdDetails = {
  id_issuing_country?: string;
  id_type?: string;
  id_subtype?: string;
};

export type KycDetails = {
  jumio_account_id: string;
  jumio_workflow_execution_id: string;
  jumio_web_href: string;
  status: KycStatus;
};

@Injectable()
export class KycService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly jumioApiService: JumioApiService,
    private readonly jumioTransactionService: JumioTransactionService,
    private readonly prisma: PrismaService,
    private readonly redemptionService: RedemptionService,
    private readonly usersService: UsersService,
    private readonly userPointsService: UserPointsService,
  ) {}

  async attempt(
    user: User,
    publicAddress: string,
    ipAddress: string,
  ): Promise<{ redemption: Redemption; transaction: JumioTransaction }> {
    return this.prisma.$transaction(async (prisma) => {
      await prisma.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(HASHTEXT($1));',
        `kyc_${user.id}`,
      );

      let redemption = await this.redemptionService.find(user);

      const canAttemptError = await this.redemptionService.canAttempt(
        redemption,
        user,
        prisma,
      );

      if (!canAttemptError.attemptable) {
        throw new ForbiddenException(canAttemptError.reason);
      }

      if (!redemption) {
        redemption = await this.redemptionService.create(
          user,
          publicAddress,
          ipAddress,
          prisma,
        );
      }
      const response = await this.jumioApiService.createAccountAndTransaction(
        user.id,
        redemption.jumio_account_id,
        String(this.config.get<number>('JUMIO_WORKFLOW_DEFINITION')),
      );

      redemption = await this.redemptionService.update(
        redemption,
        {
          kycStatus: KycStatus.IN_PROGRESS,
          jumioAccountId: response.account.id,
        },
        prisma,
      );

      redemption = await this.redemptionService.incrementAttempts(
        redemption,
        prisma,
      );

      const transaction = await this.jumioTransactionService.create(
        user,
        response.workflowExecution.id,
        response.web.href,
        prisma,
      );

      return { redemption, transaction };
    });
  }

  async handleCallback(data: JumioCallbackData): Promise<void> {
    const transaction =
      await this.jumioTransactionService.findByWorkflowExecutionId(
        data.workflowExecution.id,
      );

    if (!transaction) {
      return;
    }

    const user = await this.usersService.find(transaction.user_id);

    if (!user) {
      return;
    }

    if (!this.isSignatureValid(data.userReference, user)) {
      throw new ForbiddenException(
        `Invalid signature from Jumio callback for user '${user.id}'`,
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      await prisma.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(HASHTEXT($1));',
        `kyc_${user.id}`,
      );

      // Check were not processing a stale callback
      const latest = await this.jumioTransactionService.findLatest(user);
      if (!latest || latest.id !== transaction.id) {
        return;
      }

      if (
        latest.last_callback_at &&
        latest.last_callback_at >= new Date(data.callbackSentAt)
      ) {
        return;
      }

      const redemption = await this.redemptionService.findOrThrow(user);

      await this.refresh(redemption, latest);

      await this.jumioTransactionService.update(latest, {
        lastCallback: data,
        lastCallbackAt: new Date(),
      });
    });
  }

  async markComplete(user: User): Promise<void> {
    return this.prisma.$transaction(async (prisma) => {
      await prisma.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(HASHTEXT($1));',
        `kyc_${user.id}`,
      );

      const redemption = await this.redemptionService.find(user);
      if (!redemption) {
        return;
      }

      if (redemption.kyc_status !== 'IN_PROGRESS') {
        return;
      }

      await this.redemptionService.update(redemption, {
        kycStatus: KycStatus.WAITING_FOR_CALLBACK,
      });
    });
  }

  async refreshUser(user: User): Promise<void> {
    return this.prisma.$transaction(async (prisma) => {
      await prisma.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(HASHTEXT($1));',
        `kyc_${user.id}`,
      );

      const redemption = await this.redemptionService.find(user);
      if (!redemption) {
        return;
      }

      const transaction = await this.jumioTransactionService.findLatest(user);
      if (!transaction) {
        return;
      }

      await this.refresh(redemption, transaction);
    });
  }

  async standaloneWatchlist(userId: number): Promise<JumioTransaction> {
    const user = await this.usersService.findOrThrow(userId);
    const redemption = await this.redemptionService.findOrThrow(user);
    if (redemption.kyc_status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Can only submit standalone watchlist screen for account in status SUBMITTED, currently ${redemption.kyc_status}`,
      );
    }
    // TODO: if multiple standalone attempts occur, the last retrieval will return response without information about user (firstname lastname)
    const latest = await this.jumioTransactionService.findLatest(user);
    if (!latest) {
      throw new NotFoundException(
        'Historical transaction not found, cannot run standalone screen',
      );
    }

    // create standalone
    const standaloneCreate =
      await this.jumioApiService.createAccountAndTransaction(
        user.id,
        redemption.jumio_account_id,
        '10010',
      );
    // get/upload name info
    assert.ok(redemption.jumio_account_id);
    const retrieval = await this.jumioApiService.transactionStatus(
      redemption.jumio_account_id,
      latest.workflow_execution_id,
      false,
    );

    const screeningData =
      this.jumioApiService.getScreeningDataFromRetrieval(retrieval);

    // upload screening info
    const uploadResponse = await this.jumioApiService.uploadScreeningData(
      standaloneCreate.workflowExecution.credentials[0].api.parts.prepared_data,
      standaloneCreate.workflowExecution.credentials[0].api.token,
      screeningData,
    );

    const putResponse = await this.jumioApiService.putStandaloneScreening(
      uploadResponse.api.workflowExecution,
      uploadResponse.api.token,
    );

    // record standalone
    return await this.jumioTransactionService.create(
      user,
      putResponse.workflowExecution.id,
      '',
    );
  }

  async refresh(
    redemption: Redemption,
    transaction: JumioTransaction,
  ): Promise<void> {
    // Don't update redemption anymore for a user that has already passed KYC
    if (redemption.kyc_status === KycStatus.SUCCESS) {
      return;
    }

    assert.ok(redemption.jumio_account_id);
    const status = await this.jumioApiService.transactionStatus(
      redemption.jumio_account_id,
      transaction.workflow_execution_id,
    );

    const calculatedStatus = await this.redemptionService.calculateStatus(
      status,
    );

    // Has our user's KYC status changed
    redemption = await this.redemptionService.update(redemption, {
      kycStatus: calculatedStatus.status,
      failureMessage: calculatedStatus.failureMessage ?? undefined,
      idDetails: calculatedStatus.idDetails,
      age: calculatedStatus.age,
    });

    await this.jumioTransactionService.update(transaction, {
      decisionStatus: status.decision.type,
      lastWorkflowFetch: status,
    });
  }

  isSignatureValid(userReference: string, user: User): boolean {
    const [t, v1] = userReference.split(',');
    const { 1: timestamp } = t.split('=');
    const { 1: signature } = v1.split('=');

    const payload = `${timestamp}.${user.id}`;
    const expectedSignature = crypto
      .createHmac(
        'sha256',
        this.config.get<string>('JUMIO_API_CALLBACK_SECRET'),
      )
      .update(payload)
      .digest()
      .toString('hex');

    return signature === expectedSignature;
  }

  async estimate(
    userId: number,
  ): Promise<{ pool1: number; pool2: number; pool3: number; pool4: number }> {
    const user = await this.userPointsService.findOrThrow(userId);

    const [pool1, pool2, pool3, pool4] = await Promise.all([
      this.userPointsService.poolTotal('pool_one'),
      this.userPointsService.poolTotal('pool_two'),
      this.userPointsService.poolTotal('pool_three'),
      this.userPointsService.poolTotal('pool_four'),
    ]);

    const getTokens = (points: number, total: number, pool: number) => {
      const ratio = points / pool;
      const ore = Math.floor(ratio * total);
      const iron = ore / ORE_TO_IRON;
      return iron;
    };

    return {
      pool1: getTokens(user.pool1_points ?? 0, pool1, POOL1_TOKENS),
      pool2: getTokens(user.pool2_points ?? 0, pool2, POOL2_TOKENS),
      pool3: getTokens(user.pool3_points ?? 0, pool3, POOL3_TOKENS),
      pool4: getTokens(user.pool4_points ?? 0, pool4, POOL4_TOKENS),
    };
  }

  async allocate(pool: Pool, redemptions: Redemption[]): Promise<void> {
    //pool_one -> pool1_points
    const pointsColumn = this.userPointsService.poolToColumn(pool);
    const airdropPool = AIRDROP_CONFIG.data.find((c) => c.name === pool);
    assert.ok(airdropPool);
    const poolOre = airdropPool.coins * ORE_TO_IRON;

    const totalPoints = await this.userPointsService.poolTotal(pool);

    // allocate
    for (const redemption of redemptions) {
      const userPoints = await this.userPointsService.findOrThrow(
        redemption.user_id,
      );
      const userPoolPoints = userPoints[pointsColumn];
      if (!userPoolPoints) {
        await this.redemptionService.update(redemption, { [pool]: 0 });
        continue;
      }

      const allocatedOre = Math.floor((userPoolPoints / totalPoints) * poolOre);
      await this.redemptionService.update(redemption, { [pool]: allocatedOre });
    }
  }
}
