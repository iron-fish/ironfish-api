/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Block, Transaction } from '@prisma/client';
import { BlocksService } from '../blocks/blocks.service';
import { UpsertBlocksDto } from '../blocks/dto/upsert-blocks.dto';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class BlocksTransactionsLoader {
  constructor(
    private readonly blocksTransactionsService: BlocksTransactionsService,
    private readonly blocksService: BlocksService,
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async bulkUpsert({
    blocks,
  }: UpsertBlocksDto): Promise<(Block & { transactions: Transaction[] })[]> {
    return this.prisma.$transaction(async (prisma) => {
      const records: (Block & { transactions: Transaction[] })[] = [];
      for (const block of blocks) {
        const createdBlock = await this.blocksService.upsert(prisma, {
          ...block,
          transactionsCount: block.transactions_count,
        });
        const transactions = await this.transactionsService.bulkUpsert(
          prisma,
          block.transactions,
        );
        for (const transaction of transactions) {
          await this.blocksTransactionsService.upsert(
            prisma,
            createdBlock,
            transaction,
          );
        }
        records.push({ ...createdBlock, transactions });
      }
      return records;
    });
  }
}
