/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Block, BlockTransaction, Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListBlockTransactionOptions } from './interfaces/list-block-transactions-options';

@Injectable()
export class BlocksTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    block: Block,
    transaction: Transaction,
  ): Promise<BlockTransaction> {
    return this.prisma.$transaction(async (prisma) => {
      return prisma.blockTransaction.upsert({
        create: {
          block_id: block.id,
          transaction_id: transaction.id,
        },
        update: {
          block_id: block.id,
          transaction_id: transaction.id,
        },
        where: {
          block_id_transaction_id: {
            block_id: block.id,
            transaction_id: transaction.id,
          },
        },
      });
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
}
