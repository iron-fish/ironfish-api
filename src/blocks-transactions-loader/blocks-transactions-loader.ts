/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Block, Transaction } from '@prisma/client';
import { BlocksService } from '../blocks/blocks.service';
import { UpsertBlocksDto } from '../blocks/dto/upsert-blocks.dto';
import { BlocksDailyService } from '../blocks-daily/blocks-daily.service';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { DeleteBlockMinedEventOptions } from '../events/interfaces/delete-block-mined-event-options';
import { UpsertBlockMinedEventOptions } from '../events/interfaces/upsert-block-mined-event-options';
import { GraphileWorkerPattern } from '../graphile-worker/enums/graphile-worker-pattern';
import { GraphileWorkerService } from '../graphile-worker/graphile-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class BlocksTransactionsLoader {
  constructor(
    private readonly blocksDailyService: BlocksDailyService,
    private readonly blocksService: BlocksService,
    private readonly blocksTransactionsService: BlocksTransactionsService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async bulkUpsert({
    blocks,
  }: UpsertBlocksDto): Promise<(Block & { transactions: Transaction[] })[]> {
    const deleteBlockMinedPayloads: DeleteBlockMinedEventOptions[] = [];
    const upsertBlockMinedPayloads: UpsertBlockMinedEventOptions[] = [];

    const response = await this.prisma.$transaction(async (prisma) => {
      const records: (Block & { transactions: Transaction[] })[] = [];
      for (const block of blocks) {
        const {
          block: createdBlock,
          deleteBlockMinedOptions,
          upsertBlockMinedOptions,
        } = await this.blocksService.upsert(prisma, {
          ...block,
          previousBlockHash: block.previous_block_hash,
          transactionsCount: block.transactions.length,
        });

        if (deleteBlockMinedOptions) {
          deleteBlockMinedPayloads.push(deleteBlockMinedOptions);
        }

        if (upsertBlockMinedOptions) {
          upsertBlockMinedPayloads.push(upsertBlockMinedOptions);
        }

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

    for (const payload of deleteBlockMinedPayloads) {
      await this.graphileWorkerService.addJob(
        GraphileWorkerPattern.DELETE_BLOCK_MINED_EVENT,
        payload,
        {
          queueName: 'delete_block_mined_event',
        },
      );
    }

    for (const payload of upsertBlockMinedPayloads) {
      await this.graphileWorkerService.addJob(
        GraphileWorkerPattern.UPSERT_BLOCK_MINED_EVENT,
        payload,
        {
          queueName: 'upsert_block_mined_event',
        },
      );
    }

    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.SYNC_BLOCKS_DAILY,
      {
        date: await this.blocksDailyService.getNextDateToSync(),
      },
    );

    return response;
  }
}
