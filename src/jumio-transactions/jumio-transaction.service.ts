/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { KycStatus, User } from '@prisma/client';
import { KYC_MAX_ATTEMPTS } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { JumioTransaction, Prisma, Redemption } from '.prisma/client';

@Injectable()
export class JumioTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async find(user: User): Promise<JumioTransaction | null> {
    return this.prisma.jumioTransaction.findFirst({
      where: {
        user_id: user.id,
      },
      orderBy: {
        created_at: Prisma.SortOrder.desc,
      },
    });
  }

  async findOrThrow(user: User): Promise<JumioTransaction> {
    const jumioTransaction = await this.find(user);
    if (!jumioTransaction) {
      throw new NotFoundException('No Jumio Transactions found');
    }
    return jumioTransaction;
  }

  async upsert(
    user: User,
    workflowExecutionId: string,
    webHref: string,
  ): Promise<JumioTransaction> {
    return this.prisma.jumioTransaction.upsert({
      create: {
        user: { connect: { id: user.id } },
        workflow_execution_id: workflowExecutionId,
        web_href: webHref,
      },
      update: {
        workflow_execution_id: workflowExecutionId,
        web_href: webHref,
      },
      where: {
        user_id: user.id,
      },
    });
  }

  async create(
    user: User,
    workflowExecutionId: string,
    webHref: string,
  ): Promise<JumioTransaction> {
    return this.prisma.jumioTransaction.create({
      data: {
        user: { connect: { id: user.id } },
        workflow_execution_id: workflowExecutionId,
        web_href: webHref,
      },
    });
  }

  canRetry(transaction: JumioTransaction, redemption: Redemption): boolean {
    if (redemption.kyc_attempts >= KYC_MAX_ATTEMPTS) {
      return false;
    }

    return (
      (jumioTransaction.status === KycStatus.NOT_EXECUTED && KycStatus.NOT_EXECUTED)
      jumioTransaction.status === KycStatus.REJECTED ||
      jumioTransaction.status === KycStatus.WARNING
    );
  }
}
