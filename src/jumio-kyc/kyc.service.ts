/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { JumioTransaction, KycStatus, Redemption, User } from '@prisma/client';
import assert from 'assert';
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
    private readonly prisma: PrismaService,
    private readonly redemptionService: RedemptionService,
    private readonly jumioTransactionService: JumioTransactionService,
    private readonly jumioApiService: JumioApiService,
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
      if (canAttemptError) {
        throw new ForbiddenException(
          `Not eligible to create transaction for user ${user.id}: ${canAttemptError}`,
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
    let transaction =
      await this.jumioTransactionService.findByWorkflowExecutionId(
        data.workflowExecution.id,
      );

    if (!transaction) {
      return;
    }

    const user = await this.usersService.findOrThrow(transaction.user_id);
    const latest = await this.jumioTransactionService.findLatest(user);

    if (!latest || latest.id !== transaction.id) {
      return;
    }

    let redemption = await this.redemptionService.findOrThrow(user);
    assert.ok(redemption.jumio_account_id);

    const status = await this.jumioApiService.transactionStatus(
      redemption.jumio_account_id,
      data.workflowExecution.id,
    );

    const kycStatus = this.redemptionService.calculateStatus(status);

    if (redemption.kyc_status !== kycStatus) {
      redemption = await this.redemptionService.update(redemption, {
        kyc_status: kycStatus,
      });
    }

    transaction = await this.jumioTransactionService.update(transaction, {
      decisionStatus: status.decision.type,
      transactionStatus: status,
    });

    return { redemption, transaction };
  }
}
