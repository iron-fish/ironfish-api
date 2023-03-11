/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { instanceToPlain } from 'class-transformer';
import { JumioTransactionRetrieveResponse } from '../jumio-api/interfaces/jumio-transaction-retrieve';
import { JumioCallbackData } from '../jumio-kyc/interfaces/jumio-callback-data';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { DecisionStatus, JumioTransaction, Prisma } from '.prisma/client';

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

  async findOrThrow(id: number): Promise<JumioTransaction> {
    return await this.prisma.jumioTransaction.findFirstOrThrow({
      where: { id },
    });
  }

  async findByWorkflowIds(
    workflowExecutionIds: string[],
  ): Promise<JumioTransaction[]> {
    return await this.prisma.jumioTransaction.findMany({
      where: { workflow_execution_id: { in: workflowExecutionIds } },
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

  async findByWorkflowExecutionId(
    workflowExecutionId: string,
  ): Promise<JumioTransaction | null> {
    const workflows = await this.prisma.jumioTransaction.findMany({
      where: { workflow_execution_id: workflowExecutionId },
    });
    return workflows[workflows.length - 1];
  }

  async update(
    transaction: JumioTransaction,
    data: {
      decisionStatus?: DecisionStatus;
      lastWorkflowFetch?: JumioTransactionRetrieveResponse;
      lastCallbackAt?: Date;
      lastCallback?: JumioCallbackData;
      failureMessage?: string;
    },
  ): Promise<JumioTransaction> {
    return this.prisma.jumioTransaction.update({
      data: {
        decision_status: data.decisionStatus,
        last_workflow_fetch: instanceToPlain(data.lastWorkflowFetch),
        last_callback: instanceToPlain(data.lastCallback),
        last_callback_at: data.lastCallbackAt,
        failure_message: data.failureMessage,
      },
      where: { id: transaction.id },
    });
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
      },
    });
  }
}
