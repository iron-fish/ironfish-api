/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import {
  DecisionLabel,
  DecisionStatus,
  JumioTransaction,
  Prisma,
} from '.prisma/client';

@Injectable()
export class JumioTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async getList(user: User): Promise<JumioTransaction[]> {
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
    const jumioTransactions = await this.getList(user);
    if (!jumioTransactions.length) {
      throw new NotFoundException('No Jumio Transactions found');
    }
    return jumioTransactions[0];
  }

  async findLatest(user: User): Promise<JumioTransaction | null> {
    const jumioTransactions = await this.getList(user);
    if (!jumioTransactions.length) {
      return null;
    }
    return jumioTransactions[0];
  }

  async create(
    user: User,
    workflowExecutionId: string,
    webHref: string,
    prisma?: BasePrismaClient,
  ): Promise<JumioTransaction> {
    const client = prisma ?? this.prisma;

    return client.jumioTransaction.create({
      data: {
        user: { connect: { id: user.id } },
        workflow_execution_id: workflowExecutionId,
        web_href: webHref,
        decision_status: DecisionStatus.NOT_EXECUTED,
        decision_label: DecisionLabel.NOT_UPLOADED,
      },
    });
  }
}
