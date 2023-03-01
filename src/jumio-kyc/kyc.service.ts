/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  DecisionStatus,
  JumioTransaction,
  Redemption,
  User,
} from '@prisma/client';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';

export type KycDetails = {
  jumio_account_id: string;
  jumio_workflow_execution_id: string;
  jumio_web_href: string;
  status: DecisionStatus;
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
      decision_status: jumioStatus.capabilities.usability.decision.type,
    });
    return {
      jumio_account_id: 'foo',
      jumio_workflow_execution_id: 'bar',
      jumio_web_href: 'baz',
      status: jumioStatus.capabilities.usability.decision.type,
    };
  }

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

      if (!redemption) {
        redemption = await this.redemptionService.create(user, publicAddress);
      }

      let transaction = await this.jumioTransactionService.findLatest(user);

      if (
        !transaction ||
        this.jumioTransactionService.canRetry(transaction, redemption)
      ) {
        const response = await this.jumioApiService.createAccountAndTransaction(
          user.id,
          redemption.jumio_account_id,
        );

        await this.redemptionService.update(redemption, {
          decision_status: DecisionStatus.NOT_EXECUTED,
          jumio_account_id: response.account.id,
        });

        transaction = await this.jumioTransactionService.create(
          user,
          response.workflowExecution.id,
          response.web.href,
        );
      }

      return { redemption, transaction };
    });
  }
}
