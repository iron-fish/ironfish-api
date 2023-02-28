/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Redemption, User } from '@prisma/client';
import { JumioApiService } from '../jumio-api/jumio-api.service';
import { JumioTransactionService } from '../jumio-transactions/jumio-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedemptionService } from '../redemptions/redemption.service';

export type KycDetails = {
  jumio_account_id: string;
  jumio_workflow_execution_id: string;
  jumio_web_href: string;
};

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redemptionService: RedemptionService,
    private readonly jumioTransactionService: JumioTransactionService,
    private readonly jumioApiService: JumioApiService,
  ) {}

  async attempt(user: User, redemption: Redemption): Promise<KycDetails> {
    return await this.prisma.$transaction(async (prisma) => {
      await prisma.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(HASHTEXT($1));',
        user.id,
      );

      const response = await this.jumioApiService.createAccountAndTransaction(
        user.id,
        redemption.jumio_account_id,
      );

      await this.redemptionService.addJumioAccountId(
        redemption,
        response.jumio_account_id,
        prisma,
      );

      await this.jumioTransactionService.create(
        user,
        response.jumio_workflow_execution_id,
        response.jumio_web_href,
        prisma,
      );

      return response;
    });
  }
}
