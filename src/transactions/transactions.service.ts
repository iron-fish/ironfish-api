/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Block } from '@prisma/client';
import { classToPlain } from 'class-transformer';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlocksService } from '../blocks/blocks.service';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';
import {
  TransactionDto,
  UpsertTransactionsDto,
} from './dto/upsert-transactions.dto';
import { FindTransactionOptions } from './interfaces/find-transactions-options';
import { ListTransactionOptions } from './interfaces/list-transactions-options';
import { Transaction } from '.prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly blocksTransactionsService: BlocksTransactionsService,
    private readonly blocksService: BlocksService,
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async bulkUpsert({
    transactions,
  }: UpsertTransactionsDto): Promise<Transaction[]> {
    const records = [];
    for (const transaction of transactions) {
      records.push(await this.upsert(transaction));
    }
    return records;
  }

  private async upsert({
    hash,
    fee,
    size,
    timestamp,
    block_id,
    notes,
    spends,
  }: TransactionDto): Promise<Transaction> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    return await this.prisma.transaction.upsert({
      create: {
        hash,
        network_version: networkVersion,
        fee,
        size,
        timestamp,
        block_id,
        notes: classToPlain(notes),
        spends: classToPlain(spends),
      },
      update: {
        fee,
        size,
        timestamp,
        notes: classToPlain(notes),
        spends: classToPlain(spends),
      },
      where: {
        uq_transactions_on_hash_and_network_version: {
          hash,
          network_version: networkVersion,
        },
      },
    });
  }

  async find(
    options: FindTransactionOptions,
  ): Promise<Transaction | (Transaction & { blocks: Block[] }) | null> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const { withBlocks } = options;

    const where = {
      hash: options.hash,
      network_version: networkVersion,
    };

    const transaction = await this.prisma.transaction.findFirst({
      where,
    });

    if (transaction !== null && withBlocks) {
      const blocks = await this.getAssociatedBlocks(transaction);
      return { ...transaction, blocks };
    }

    return transaction;
  }

  async list(
    options: ListTransactionOptions,
  ): Promise<Transaction[] | (Transaction & { blocks: Block[] })[]> {
    const orderBy = { id: SortOrder.DESC };
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const { withBlocks } = options;

    if (options.search !== undefined) {
      const where = {
        hash: {
          contains: options.search,
        },
      };
      return await this.getTransactionsData(orderBy, limit, where, withBlocks);
    } else if (options.blockId !== undefined) {
      const blocksTransactions = await this.blocksTransactionsService.list({
        blockId: options.blockId,
      });
      const transactionsIds = blocksTransactions.map(
        (blockTransaction) => blockTransaction.transaction_id,
      );
      const where = {
        id: { in: transactionsIds },
      };
      return await this.getTransactionsData(orderBy, limit, where, withBlocks);
    } else {
      return await this.getTransactionsData(
        orderBy,
        limit,
        undefined,
        withBlocks,
      );
    }
  }

  private async getTransactionsData(
    orderBy: { id: SortOrder } | undefined,
    limit: number | undefined,
    where: Record<string, unknown> | undefined,
    includeBlocks: boolean | undefined,
  ): Promise<Transaction[] | (Transaction & { blocks: Block[] })[]> {
    const transactions = await this.prisma.transaction.findMany({
      orderBy,
      take: limit,
      where,
    });

    if (includeBlocks) {
      return Promise.all(
        transactions.map(async (transaction) => {
          const blocks = await this.getAssociatedBlocks(transaction);
          return { ...transaction, blocks };
        }),
      );
    }

    return transactions;
  }

  private async getAssociatedBlocks(
    transaction: Transaction,
  ): Promise<Block[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const blocksTransctions = await this.blocksTransactionsService.list({
      transactionId: transaction.id,
    });
    const blockIds = blocksTransctions.map(
      (blockTransaction) => blockTransaction.block_id,
    );
    const blocks = await this.blocksService.findByIds(blockIds, networkVersion);
    return blocks;
  }
}
