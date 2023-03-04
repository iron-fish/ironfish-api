/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { JumioTransaction, KycStatus, Redemption, User } from '@prisma/client';
import assert from 'assert';
import crypto from 'crypto';
import { ApiConfigService } from '../api-config/api-config.service';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';
import { UsersService } from '../users/users.service';
import { JumioCallbackData } from './interfaces/jumio-callback-data';

export type IdDetails = {
  id_issuing_country: string;
  id_type: string;
  id_subtype: string;
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
  ) {}

  async attempt(
    user: User,
    publicAddress: string,
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
        throw new ForbiddenException(
          `Not eligible to create transaction for user ${user.id}: ${canAttemptError.reason}`,
        );
      }

      if (!redemption) {
        redemption = await this.redemptionService.create(
          user,
          publicAddress,
          prisma,
        );
      }

      const response = await this.jumioApiService.createAccountAndTransaction(
        user.id,
        redemption.jumio_account_id,
      );

      redemption = await this.redemptionService.update(
        redemption,
        {
          kyc_status: KycStatus.IN_PROGRESS,
          jumio_account_id: response.account.id,
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

    const user = await this.usersService.findOrThrow(transaction.user_id);

    if (!this.isSignatureValid(data.userReference, user)) {
      throw new ForbiddenException(
        `Invalid signature from Jumio callback for user '${user.id}'`,
      );
    }

    // Check were not processing a stale callback
    const latest = await this.jumioTransactionService.findLatest(user);
    if (!latest || latest.id !== transaction.id) {
      return;
    }

    if (
      transaction.last_callback_at &&
      transaction.last_callback_at >= new Date(data.callbackSentAt)
    ) {
      return;
    }

    const redemption = await this.redemptionService.findOrThrow(user);

    await this.refresh(redemption, transaction);

    await this.jumioTransactionService.update(transaction, {
      lastCallback: data,
      lastCallbackAt: new Date(),
    });
  }

  async refreshUser(user: User): Promise<void> {
    const redemption = await this.redemptionService.find(user);
    if (!redemption) {
      return;
    }

    const transaction = await this.jumioTransactionService.findLatest(user);
    if (!transaction) {
      return;
    }

    await this.refresh(redemption, transaction);
  }

  async refresh(
    redemption: Redemption,
    transaction: JumioTransaction,
  ): Promise<void> {
    // Don't process callbacks anymore for a user that has already passed KYC
    if (
      redemption.kyc_status === KycStatus.SUCCESS ||
      redemption.kyc_status === KycStatus.SUBMITTED
    ) {
      return;
    }

    assert.ok(redemption.jumio_account_id);
    const status = await this.jumioApiService.transactionStatus(
      redemption.jumio_account_id,
      transaction.workflow_execution_id,
    );

    const kycStatus = this.redemptionService.calculateStatus(status);

    // Has our user's KYC status changed
    if (redemption.kyc_status !== kycStatus) {
      redemption = await this.redemptionService.update(redemption, {
        kyc_status: kycStatus,
      });
    }

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
}
