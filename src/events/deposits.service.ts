/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Deposit } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UpsertDepositsOperationDto } from './dto/upsert-deposit.dto';

@Injectable()
export class DepositsService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async head(): Promise<Deposit | null> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');

    return this.prisma.deposit.findFirst({
      where: {
        main: true,
        network_version: networkVersion,
      },
      orderBy: {
        block_sequence: SortOrder.DESC,
      },
    });
  }

  async upsert(
    prisma: BasePrismaClient,
    operation: UpsertDepositsOperationDto,
  ): Promise<Deposit[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');

    // For each block
    //   For each transaction
    //      Create Map<Graffiti, Ore>
    //
    //      For each note
    //         Add amount for each graffit on each decrypted
    //
    //      If any amount meets criteria
    //         Upsert event for this transaction

    await this.prisma.$transaction(async (prisma) => {
      for (const transaction of block.transactions) {
        const amounts = new Map<string, number>();

        for (const note of transaction.notes) {
          const amount = amounts.get(note.memo) ?? 0;
          amounts.set(note.memo, amount + note.amount);
        }

        const graffitis = Array.from(amounts.keys());

        const users = await prisma.user.findMany({
          where: {
            graffiti: { in: graffitis },
          },
        });

        for(const user of users) {
          // TODO: create event for user
        }

      prisma.transactionDecrypted.
    }

    hash = standardizeHash(hash);

    await prisma.transactionDecrypted.upsert({
      create: {
        hash,
        network_version: networkVersion,
        fee,
        size,
        notes: classToPlain(notes),
        spends: classToPlain(spends),
      },
      update: {
        fee,
        size,
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
