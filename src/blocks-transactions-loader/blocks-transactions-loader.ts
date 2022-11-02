/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Block, Transaction } from '@prisma/client';
import { BlocksService } from '../blocks/blocks.service';
import { BlockDto, UpsertBlocksDto } from '../blocks/dto/upsert-blocks.dto';
import { BlocksDailyService } from '../blocks-daily/blocks-daily.service';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { EventsService } from '../events/events.service';
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
    private readonly eventsService: EventsService,
  ) {}

  async bulkUpsert({
    blocks,
  }: UpsertBlocksDto): Promise<(Block & { transactions: Transaction[] })[]> {
    const deleteBlockMinedPayloads: DeleteBlockMinedEventOptions[] = [];
    const upsertBlockMinedPayloads: UpsertBlockMinedEventOptions[] = [];

    const previousHashes = new Map<string, BlockDto>();
    for (const block of blocks) {
      previousHashes.set(block.hash, block);
    }

    const records: (Block & { transactions: Transaction[] })[] = [];

    let updateMinedBlockEvents = false;

    for (const block of blocks) {
      if (!updateMinedBlockEvents) {
        updateMinedBlockEvents = this.eventsService.blockMinedEnabled(
          block.sequence,
        );
      }

      let timeSinceLastBlockMs: number | undefined = undefined;
      if (block.previous_block_hash !== undefined) {
        const seenPreviousBlock = previousHashes.get(block.previous_block_hash);
        if (seenPreviousBlock) {
          const prevTimestamp = seenPreviousBlock.timestamp;
          timeSinceLastBlockMs =
            block.timestamp.getTime() - prevTimestamp.getTime();
        } else {
          const unseenPreviousBlock = await this.prisma.block.findFirst({
            where: {
              hash: block.previous_block_hash,
            },
          });
          if (unseenPreviousBlock) {
            timeSinceLastBlockMs =
              block.timestamp.getTime() -
              unseenPreviousBlock.timestamp.getTime();
          }
        }
      }

      await this.prisma.$transaction(
        async (prisma) => {
          const {
            block: createdBlock,
            deleteBlockMinedOptions,
            upsertBlockMinedOptions,
          } = await this.blocksService.upsert(prisma, {
            ...block,
            timeSinceLastBlockMs,
            previousBlockHash: block.previous_block_hash,
            transactionsCount: block.transactions.length,
          });

          if (deleteBlockMinedOptions) {
            deleteBlockMinedPayloads.push(deleteBlockMinedOptions);
          }

          if (upsertBlockMinedOptions) {
            upsertBlockMinedPayloads.push(upsertBlockMinedOptions);
          }

          const transactions =
            await this.transactionsService.bulkUpsertWithClient(
              prisma,
              block.transactions,
            );

          for (let i = 0; i < transactions.length; ++i) {
            const transaction = transactions[i];

            await this.blocksTransactionsService.upsert(
              prisma,
              createdBlock,
              transaction,
              i,
            );
          }

          records.push({ ...createdBlock, transactions });
        },
        {
          // We increased this from the default of 5000 because the transactions were
          // timing out and failing to upsert blocks
          timeout: 30000,
        },
      );
    }

    if (updateMinedBlockEvents) {
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
    }

    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.SYNC_BLOCKS_DAILY,
      {
        date: await this.blocksDailyService.getNextDateToSync(),
      },
    );

    return records;
  }
}
