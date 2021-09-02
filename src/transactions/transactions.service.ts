/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { classToPlain } from 'class-transformer';
import { ApiConfigService } from '../api-config/api-config.service';
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

  async find(options: FindTransactionOptions): Promise<Transaction | null> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    return this.prisma.transaction.findFirst({
      where: {
        hash: options.hash,
        network_version: networkVersion,
      },
    });
  }

  async list(options: ListTransactionOptions): Promise<Transaction[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const limit = Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);

    if (options.search !== undefined) {
      return this.prisma.transaction.findMany({
        orderBy: {
          id: SortOrder.DESC,
        },
        take: limit,
        where: {
          hash: {
            contains: options.search,
          },
          network_version: networkVersion,
        },
      });
    } else {
      return this.prisma.transaction.findMany({
        orderBy: {
          id: SortOrder.DESC,
        },
        take: limit,
      });
    }
  }
}
