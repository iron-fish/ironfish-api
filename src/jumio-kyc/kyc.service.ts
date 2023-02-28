/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JumioTransaction, KycStatus, User } from '@prisma/client';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';

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
  ) {}

  async status(
    user: User,
    jumioTransaction: JumioTransaction,
  ): Promise<KycDetails> {
    const redemption = await this.redemptionService.find(user);
    if (!redemption || !redemption.jumio_account_id) {
      throw new InternalServerErrorException(
        'Redemption and jumio account should exist for users with transactions',
      );
    }
    const jumioStatus = await this.jumioApiService.transactionStatus(
      redemption.jumio_account_id,
      jumioTransaction.workflow_execution_id,
    );
    await this.redemptionService.update(redemption, {
      status: jumioStatus.decision.details.label,
    });
    return {
      jumio_account_id: 'foo',
      jumio_workflow_execution_id: 'bar',
      jumio_web_href: 'baz',
      status: jumioStatus.decision.details.label,
    };
  }

  async attempt(user: User, public_address: string): Promise<KycDetails> {
    const pendingStatus = KycStatus.NOT_EXECUTED;
    // Jumio API ties together account creation with transaction creation
    return this.prisma.$transaction(async (prisma) => {
      await prisma.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(HASHTEXT($1));',
        `kyc_${user.id}`,
      );
      const redemption = await this.redemptionService.getOrCreate(
        user,
        public_address,
      );
      const response = await this.jumioApiService.createAccountAndTransaction(
        user.id,
        redemption.jumio_account_id,
      );
      await this.redemptionService.update(redemption, {
        status: pendingStatus,
        jumio_account_id: response.account.id,
      });
      await this.jumioTransactionService.upsert(
        user,
        response.workflowExecution.id,
        response.web.href,
      );
      return {
        jumio_account_id: response.account.id,
        jumio_workflow_execution_id: response.workflowExecution.id,
        jumio_web_href: response.web.href,
        status: pendingStatus,
      };
    });
  }
}
