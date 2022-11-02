/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Block, Prisma } from '@prisma/client';
import { classToPlain } from 'class-transformer';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { standardizeHash } from '../common/utils/hash';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { FindTransactionOptions } from './interfaces/find-transactions-options';
import { ListTransactionOptions } from './interfaces/list-transactions-options';
import { UpsertTransactionOptions } from './interfaces/upsert-transaction-options';
import { Transaction } from '.prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly blocksTransactionsService: BlocksTransactionsService,
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createManyWithClient(
    prisma: BasePrismaClient,
    transactions: UpsertTransactionOptions[],
  ): Promise<Transaction[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');

    await prisma.transaction.createMany({
      data: transactions.map((tx) => ({
        hash: standardizeHash(tx.hash),
        network_version: networkVersion,
        fee: tx.fee,
        size: tx.size,
        notes: classToPlain(tx.notes),
        spends: classToPlain(tx.spends),
      })),
      skipDuplicates: true,
    });

    return await this.findMany(prisma, transactions);
  }

  async findMany(
    prisma: BasePrismaClient,
    transactions: UpsertTransactionOptions[],
  ): Promise<Transaction[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');

    return await prisma.transaction.findMany({
      where: {
        hash: {
          in: transactions.map((tx) => standardizeHash(tx.hash)),
        },
        network_version: networkVersion,
      },
    });
  }

  async createMany(
    transactions: UpsertTransactionOptions[],
  ): Promise<Transaction[]> {
    return this.prisma.$transaction(async (prisma) => {
      return this.createManyWithClient(prisma, transactions);
    });
  }

  async find(
    options: FindTransactionOptions,
  ): Promise<Transaction | (Transaction & { blocks: Block[] }) | null> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const { withBlocks } = options;

    const where = {
      hash: standardizeHash(options.hash),
      network_version: networkVersion,
    };

    const transaction = await this.prisma.transaction.findFirst({
      where,
    });

    if (transaction !== null && withBlocks) {
      const blocks =
        await this.blocksTransactionsService.findBlocksByTransaction(
          transaction,
        );
      return { ...transaction, blocks };
    }

    return transaction;
  }

  async list(
    options: ListTransactionOptions,
  ): Promise<Transaction[] | (Transaction & { blocks: Block[] })[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const orderBy = { id: SortOrder.DESC };
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const withBlocks = options.withBlocks ?? false;

    if (options.search !== undefined) {
      const where = {
        hash: standardizeHash(options.search),
        network_version: networkVersion,
      };
      return this.getTransactionsData(orderBy, limit, where, withBlocks);
    } else if (options.blockId !== undefined) {
      const blocksTransactions = await this.blocksTransactionsService.list({
        blockId: options.blockId,
      });
      const transactionsIds = blocksTransactions.map(
        (blockTransaction) => blockTransaction.transaction_id,
      );
      const where = {
        id: { in: transactionsIds },
        network_version: networkVersion,
      };
      return this.getTransactionsData(orderBy, limit, where, withBlocks);
    } else {
      return this.getTransactionsData(orderBy, limit, {}, withBlocks);
    }
  }

  private async getTransactionsData(
    orderBy: { id: SortOrder },
    limit: number,
    where: Prisma.TransactionWhereInput,
    includeBlocks: boolean,
  ): Promise<Transaction[] | (Transaction & { blocks: Block[] })[]> {
    const transactions = await this.prisma.transaction.findMany({
      orderBy,
      take: limit,
      where,
    });

    if (includeBlocks) {
      const transactionsWithBlocks = [];
      for (const transaction of transactions) {
        const blocks =
          await this.blocksTransactionsService.findBlocksByTransaction(
            transaction,
          );
        transactionsWithBlocks.push({
          ...transaction,
          blocks,
        });
      }
      return transactionsWithBlocks;
    }

    return transactions;
  }
}
