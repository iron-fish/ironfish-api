/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Block, Transaction } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { LoadDescriptionsOptions } from '../assets-loader/interfaces/load-descriptions-options';
import { BlocksService } from '../blocks/blocks.service';
import { BlockDto, UpsertBlocksDto } from '../blocks/dto/upsert-blocks.dto';
import { BlockOperation } from '../blocks/enums/block-operation';
import { BlocksDailyService } from '../blocks-daily/blocks-daily.service';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { standardizeHash } from '../common/utils/hash';
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
    private readonly config: ApiConfigService,
    private readonly graphileWorkerService: GraphileWorkerService,
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async createMany({
    blocks,
  }: UpsertBlocksDto): Promise<(Block & { transactions: Transaction[] })[]> {
    const previousHashes = new Map<string, BlockDto>();
    for (const block of blocks) {
      previousHashes.set(block.hash, block);
    }

    const records: (Block & { transactions: Transaction[] })[] = [];

    for (const block of blocks) {
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
          const createdBlock = await this.blocksService.upsert(prisma, {
            ...block,
            timeSinceLastBlockMs,
            previousBlockHash: block.previous_block_hash,
            transactionsCount: block.transactions.length,
            difficulty: BigInt(block.difficulty),
            work: BigInt(block.work ?? 0),
          });

          // attach the block sequence to each transaction
          const create = block.transactions.map((transaction) => ({
            ...transaction,
            seen_sequence: block.sequence,
          }));

          // Create new Transaction records
          const transactions =
            await this.transactionsService.createManyWithClient(prisma, create);

          // Get the index of the each transaction in the block
          const indexedTransactions = block.transactions.map((dto, index) => {
            const transaction = transactions.find(
              (t) => t.hash === standardizeHash(dto.hash),
            );

            if (transaction === undefined) {
              throw new Error('Transaction must have been created');
            }

            return { transaction, index };
          });

          await this.blocksTransactionsService.createMany(
            prisma,
            createdBlock,
            indexedTransactions,
          );

          records.push({ ...createdBlock, transactions });
        },
        {
          // We increased this from the default of 5000 because the transactions were
          // timing out and failing to upsert blocks
          timeout: this.config.get<number>('BLOCK_LOADER_TRANSACTION_TIMEOUT'),
        },
      );

      for (const transaction of block.transactions) {
        await this.graphileWorkerService.addJob<LoadDescriptionsOptions>(
          GraphileWorkerPattern.LOAD_ASSET_DESCRIPTIONS,
          { main: block.type === BlockOperation.CONNECTED, transaction },
        );
      }
    }

    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.SYNC_BLOCKS_DAILY,
      {
        date: await this.blocksDailyService.getNextDateToSync(),
      },
    );

    await this.graphileWorkerService.addJob(
      GraphileWorkerPattern.REFRESH_NATIVE_ASSET_SUPPLY,
      undefined,
      { jobKey: 'refresh_native_asset' },
    );

    return records;
  }
}
