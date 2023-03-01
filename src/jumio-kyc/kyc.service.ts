/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { JumioTransaction, KycStatus, Redemption, User } from '@prisma/client';
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
          kyc_status: KycStatus.TRY_AGAIN,
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
