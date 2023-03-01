/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { KYC_MAX_ATTEMPTS } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  JumioTransaction,
  Prisma,
  Redemption,
  WorkflowStatus,
} from '.prisma/client';

@Injectable()
export class JumioTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async find(user: User): Promise<JumioTransaction[]> {
    return this.prisma.jumioTransaction.findMany({
      where: {
        user_id: user.id,
      },
      orderBy: {
        created_at: Prisma.SortOrder.desc,
      },
    });
  }

  async findLatestOrThrow(user: User): Promise<JumioTransaction> {
    const jumioTransaction = await this.find(user);
    if (!jumioTransaction) {
      throw new NotFoundException('No Jumio Transactions found');
    }
    return jumioTransaction[0];
  }

  async findLatest(user: User): Promise<JumioTransaction | null> {
    const jumioTransaction = await this.find(user);
    if (!jumioTransaction) {
      return null;
    }
    return jumioTransaction[0];
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
        status: WorkflowStatus.INITIATED,
      },
    });
  }

  canRetry(transaction: JumioTransaction, redemption: Redemption): boolean {
    if (redemption.kyc_attempts >= KYC_MAX_ATTEMPTS) {
      return false;
    }
    return true;
  }
}
