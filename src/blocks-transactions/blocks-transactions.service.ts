/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Block, BlockTransaction, Prisma, Transaction } from '@prisma/client';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { ListBlockTransactionOptions } from './interfaces/list-block-transactions-options';

@Injectable()
export class BlocksTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    blockId: number,
    transactionId: number,
  ): Promise<BlockTransaction | null> {
    return this.prisma.blockTransaction.findUnique({
      where: {
        block_id_transaction_id: {
          block_id: blockId,
          transaction_id: transactionId,
        },
      },
    });
  }

  async deleteMany(
    prisma: BasePrismaClient,
    block: Block,
    transactions: Transaction[],
  ): Promise<Prisma.BatchPayload> {
    return prisma.blockTransaction.deleteMany({
      where: {
        block_id: block.id,
        transaction_id: {
          in: transactions.map((tx) => tx.id),
        },
      },
    });
  }

  async createMany(
    prisma: BasePrismaClient,
    block: Block,
    transactions: { transaction: Transaction; index: number }[],
  ): Promise<Prisma.BatchPayload> {
    return prisma.blockTransaction.createMany({
      data: transactions.map((tx) => ({
        block_id: block.id,
        transaction_id: tx.transaction.id,
        index: tx.index,
      })),
      skipDuplicates: true,
    });
  }

  async upsert(
    prisma: BasePrismaClient,
    block: Block,
    transaction: Transaction,
    index: number,
  ): Promise<BlockTransaction> {
    return prisma.blockTransaction.upsert({
      create: {
        block_id: block.id,
        transaction_id: transaction.id,
        index,
      },
      update: {
        block_id: block.id,
        transaction_id: transaction.id,
        index,
      },
      where: {
        block_id_transaction_id: {
          block_id: block.id,
          transaction_id: transaction.id,
        },
      },
    });
  }

  async list(
    options: ListBlockTransactionOptions,
  ): Promise<BlockTransaction[]> {
    if (options.blockId) {
      return this.prisma.blockTransaction.findMany({
        where: {
          block_id: options.blockId,
        },
      });
    } else if (options.transactionId) {
      return this.prisma.blockTransaction.findMany({
        where: {
          transaction_id: options.transactionId,
        },
      });
    } else {
      throw new UnprocessableEntityException();
    }
  }

  async findBlocksByTransaction(transaction: Transaction): Promise<Block[]> {
    const blocksTransactions = await this.prisma.blockTransaction.findMany({
      where: {
        transaction_id: transaction.id,
      },
      include: {
        block: true,
      },
    });
    return blocksTransactions.map((blockTransaction) => blockTransaction.block);
  }

  async findTransactionsByBlock(block: Block): Promise<Transaction[]> {
    const blocksTransactions =
      await this.prisma.readClient.blockTransaction.findMany({
        where: {
          block_id: block.id,
        },
        include: {
          transaction: true,
        },
        orderBy: {
          index: SortOrder.ASC,
        },
      });
    return blocksTransactions.map(
      (blockTransaction) => blockTransaction.transaction,
    );
  }
}
