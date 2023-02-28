/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JumioTransaction, Prisma } from '.prisma/client';

@Injectable()
export class JumioTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async getLastestOrThrow(user: User): Promise<JumioTransaction> {
    const jumioTransactions = await this.prisma.jumioTransaction.findMany({
      where: {
        user_id: user.id,
      },
      orderBy: {
        created_at: Prisma.SortOrder.desc,
      },
    });
    if (jumioTransactions.length < 1) {
      throw new NotFoundException('No Jumio Transactions found');
    }
    return jumioTransactions[0];
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
}
