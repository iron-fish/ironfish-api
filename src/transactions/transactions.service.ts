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
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
    private readonly blocksTransactionsService: BlocksTransactionsService,
    private readonly blocksService: BlocksService,
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
  ): Promise<Transaction | (Transaction & { block: Block }) | null> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const include = { block: options.withBlock };

    return this.prisma.transaction.findFirst({
      where: {
        hash: options.hash,
        network_version: networkVersion,
      },
      include,
    });
  }

  async list(
    options: ListTransactionOptions,
  ): Promise<Transaction[] | (Transaction & { blocks: Block[] })[]> {
    const orderBy = { id: SortOrder.DESC };
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const { withBlock } = options;

    if (options.search !== undefined) {
      const where = {
        hash: {
          contains: options.search,
        },
      };
      return await this.getTransactionsData(
        orderBy,
        limit,
        where,
        networkVersion,
        withBlock,
      );
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
      return await this.getTransactionsData(
        orderBy,
        limit,
        where,
        networkVersion,
        withBlock,
      );
    } else {
      return await this.getTransactionsData(
        orderBy,
        limit,
        undefined,
        networkVersion,
        withBlock,
      );
    }
  }

  private async getTransactionsData(
    orderBy: { id: SortOrder },
    limit: number,
    where: Record<string, unknown> | undefined,
    networkVersion: number,
    includeBlock: boolean | undefined,
  ): Promise<Transaction[] | (Transaction & { blocks: Block[] })[]> {
    const transactions = await this.prisma.transaction.findMany({
      orderBy,
      take: limit,
      where,
    });

    if (includeBlock) {
      return Promise.all(
        transactions.map(async (transaction) => {
          const blocksTransctions = await this.blocksTransactionsService.list({
            transactionId: transaction.id,
          });
          const blockIds = blocksTransctions.map(
            (blockTransaction) => blockTransaction.block_id,
          );
          const blocks = await this.blocksService.findByIds(
            blockIds,
            networkVersion,
          );
          return { ...transaction, blocks };
        }),
      );
    }

    return transactions;
  }
}
