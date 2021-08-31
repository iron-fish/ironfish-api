/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  TransactionDto,
  UpsertTransactionsDto,
} from './dto/upsert-transactions.dto';
import { Transaction } from '.prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async bulkUpsert({ transactions }: UpsertTransactionsDto): Promise<Transaction[]> {
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
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
    return this.prisma.$transaction(async (prisma) => {
      const transaction = await prisma.transaction.upsert({
        create: {
          hash,
          network_version: networkVersion,
          fee,
          size,
          timestamp,
          block_id,
          notes,
          spends,
        },
        update: {
          fee,
          size,
          timestamp,
          notes,
          spends,
        },
        where: {
          uq_transactions_on_hash_and_network_version: {
            hash,
            network_version: networkVersion,
          },
        },
      });

      return transaction;
    });
  }
}
