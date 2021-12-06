/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import is from '@sindresorhus/is';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { getNextDate } from '../common/utils/date';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UsersService } from '../users/users.service';
import { BlockOperation } from './enums/block-operation';
import { BlocksDateMetrics } from './interfaces/blocks-date-metrics';
import { BlocksStatus } from './interfaces/blocks-status';
import { FindBlockOptions } from './interfaces/find-block-options';
import { ListBlocksOptions } from './interfaces/list-block-options';
import { UpsertBlockOptions } from './interfaces/upsert-block-options';
import { Block, Prisma, Transaction } from '.prisma/client';

@Injectable()
export class BlocksService {
  constructor(
    private readonly blocksTransactionsService: BlocksTransactionsService,
    private readonly config: ApiConfigService,
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async upsert(
    prisma: BasePrismaClient,
    {
      difficulty,
      graffiti,
      hash,
      previous_block_hash,
      sequence,
      timestamp,
      transactionsCount,
      type,
      size,
    }: UpsertBlockOptions,
  ): Promise<Block> {
    const main = type === BlockOperation.CONNECTED;
    const networkVersion = this.config.get<number>('NETWORK_VERSION');

    const block = await prisma.block.upsert({
      create: {
        hash,
        sequence,
        difficulty,
        main,
        timestamp,
        graffiti,
        transactions_count: transactionsCount,
        network_version: networkVersion,
        previous_block_hash,
        size,
        difficulty_temporary: difficulty,
      },
      update: {
        sequence,
        difficulty,
        main,
        timestamp,
        graffiti,
        transactions_count: transactionsCount,
        previous_block_hash,
        size,
        difficulty_temporary: difficulty,
      },
      where: {
        uq_blocks_on_hash_and_network_version: {
          hash,
          network_version: networkVersion,
        },
      },
    });

    const user = await this.usersService.findConfirmedByGraffiti(
      graffiti,
      prisma,
    );
    if (user && timestamp > user.created_at) {
      if (main) {
        await this.eventsService.upsertBlockMined(block, user, prisma);
      } else {
        await this.eventsService.deleteBlockMined(block, user, prisma);
      }
    }

    return block;
  }

  async head(): Promise<Block> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const block = await this.prisma.block.findFirst({
      orderBy: {
        sequence: SortOrder.DESC,
      },
      where: {
        main: true,
        network_version: networkVersion,
      },
    });
    if (!block) {
      throw new NotFoundException();
    }
    return block;
  }

  async list(options: ListBlocksOptions): Promise<{
    data: Block[] | (Block & { transactions: Transaction[] })[];
    hasPrevious: boolean;
    hasNext: boolean;
  }> {
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const orderBy = { id: SortOrder.DESC };
    const skip = cursor ? 1 : 0;
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const withTransactions = options.withTransactions ?? false;
    const main = options.main ?? undefined;
    if (options.sequenceGte !== undefined && options.sequenceLt !== undefined) {
      const where = {
        sequence: {
          gte: options.sequenceGte,
          lt: options.sequenceLt,
        },
        main,
        network_version: networkVersion,
      };
      return {
        data: await this.getBlocksData(
          cursor,
          orderBy,
          where,
          skip,
          limit,
          withTransactions,
        ),
        hasNext: false,
        hasPrevious: false,
      };
    } else if (options.search !== undefined) {
      const search = options.search;

      let filter = [];
      if (isNaN(Number(search))) {
        filter = [
          {
            hash: search,
          },
          {
            graffiti: search,
          },
        ];
      } else {
        filter = [
          {
            graffiti: search,
          },
          {
            sequence: Number(search),
          },
        ];
      }

      const where = {
        main,
        network_version: networkVersion,
        OR: filter,
      };
      const data = await this.getBlocksData(
        cursor,
        orderBy,
        where,
        skip,
        limit,
        withTransactions,
      );
      return {
        data,
        ...(await this.getListMetadata(data, where, orderBy)),
      };
    } else if (options.transactionId !== undefined) {
      const blocksTransactions = await this.blocksTransactionsService.list({
        transactionId: options.transactionId,
      });
      const blockIds = blocksTransactions.map(
        (blockTransaction) => blockTransaction.block_id,
      );
      const where = {
        // We are choosing not to include a constraint for main as we want
        // to be able to return blocks that aren't a part of the main chain
        id: { in: blockIds },
        network_version: networkVersion,
      };
      const data = await this.getBlocksData(
        undefined,
        orderBy,
        where,
        skip,
        limit,
        withTransactions,
      );
      return {
        data,
        ...(await this.getListMetadata(data, where, orderBy)),
      };
    } else if (options.transactionId !== undefined) {
      const blocksTransactions = await this.blocksTransactionsService.list({
        transactionId: options.transactionId,
      });
      const blockIds = blocksTransactions.map(
        (blockTransaction) => blockTransaction.block_id,
      );
      const where = {
        // We are choosing not to include a constraint for main as we want
        // to be able to return blocks that aren't a part of the main chain
        id: { in: blockIds },
        network_version: networkVersion,
      };
      const data = await this.getBlocksData(
        undefined,
        orderBy,
        where,
        skip,
        limit,
        withTransactions,
      );
      return {
        data,
        ...(await this.getListMetadata(data, where, orderBy)),
      };
    } else {
      const where = {
        main,
        network_version: networkVersion,
      };
      const data = await this.getBlocksData(
        cursor,
        orderBy,
        where,
        skip,
        limit,
        withTransactions,
      );
      return {
        data,
        ...(await this.getListMetadata(data, where, orderBy)),
      };
    }
  }

  async getDateMetrics(
    prisma: BasePrismaClient,
    date: Date,
  ): Promise<BlocksDateMetrics> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const end = getNextDate(date);
    const dateMetricsResponse = await prisma.$queryRawUnsafe<
      {
        average_block_time_ms: number;
        average_difficulty_millis: number;
        blocks_count: number;
        blocks_with_graffiti_count: number;
        chain_sequence: number;
        transactions_count: number;
        unique_graffiti_count: number;
      }[]
    >(
      `
      SELECT
        FLOOR(COALESCE(EXTRACT(EPOCH FROM MAX(timestamp) - MIN(timestamp)), 0) * 1000 / GREATEST(COUNT(*), 1)) AS average_block_time_ms,
        COALESCE(FLOOR(AVG(difficulty) * 1000), 0) AS average_difficulty_millis,
        COUNT(*) AS blocks_count,
        COALESCE(SUM(CASE WHEN graffiti != '' THEN 1 ELSE 0 END), 0) AS blocks_with_graffiti_count,
        COALESCE(MAX(sequence), 0) AS chain_sequence,
        COALESCE(SUM(transactions_count), 0) AS transactions_count,
        COUNT(DISTINCT graffiti) AS unique_graffiti_count
      FROM
        blocks
      WHERE
        '${date.toISOString()}' <= timestamp AND
        timestamp < '${end.toISOString()}' AND
        main = TRUE AND
        network_version = $1
    `,
      networkVersion,
    );
    if (
      !is.array(dateMetricsResponse) ||
      dateMetricsResponse.length !== 1 ||
      !is.object(dateMetricsResponse[0])
    ) {
      throw new Error('Unexpected database response');
    }

    const cumulativeMetricsResponse = await this.prisma.$queryRawUnsafe<
      { cumulative_unique_graffiti: number }[]
    >(
      `
      SELECT
        COUNT(*) AS cumulative_unique_graffiti
      FROM (
        SELECT 
          DISTINCT graffiti 
        FROM 
          blocks 
        WHERE 
          timestamp < '${end.toISOString()}' AND
          main = true AND
          network_version = $1
      ) AS main_blocks
    `,
      networkVersion,
    );
    if (
      !is.array(cumulativeMetricsResponse) ||
      cumulativeMetricsResponse.length !== 1 ||
      !is.object(cumulativeMetricsResponse[0])
    ) {
      throw new Error('Unexpected database response');
    }

    return {
      averageBlockTimeMs: dateMetricsResponse[0].average_block_time_ms,
      averageDifficultyMillis: dateMetricsResponse[0].average_difficulty_millis,
      blocksCount: dateMetricsResponse[0].blocks_count,
      blocksWithGraffitiCount:
        dateMetricsResponse[0].blocks_with_graffiti_count,
      chainSequence: dateMetricsResponse[0].chain_sequence,
      cumulativeUniqueGraffiti:
        cumulativeMetricsResponse[0].cumulative_unique_graffiti,
      transactionsCount: dateMetricsResponse[0].transactions_count,
      uniqueGraffiti: dateMetricsResponse[0].unique_graffiti_count,
    };
  }

  async getStatus(): Promise<BlocksStatus> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const [chainHeight, markedBlocks] = await this.prisma.$transaction([
      this.prisma.block.count({
        where: {
          main: true,
          network_version: networkVersion,
        },
      }),
      this.prisma.block.count({
        where: {
          main: true,
          graffiti: {
            not: '',
          },
          network_version: networkVersion,
        },
      }),
    ]);

    // There's currently a bug in Prisma in which 'distinct' is not actually supported
    // in count despite it being included in the documentation.
    // See more: https://github.com/prisma/prisma/issues/4228
    const uniqueGraffiti = (
      await this.prisma.$queryRawUnsafe<{ count: number }[]>(
        'SELECT COUNT(*) FROM (SELECT DISTINCT graffiti FROM blocks WHERE main = true AND network_version = $1) AS main_blocks;',
        networkVersion,
      )
    )[0].count;
    const percentageMarked = markedBlocks / chainHeight;
    return {
      chainHeight,
      percentageMarked,
      uniqueGraffiti,
    };
  }

  private async getBlocksData(
    cursor: { id: number } | undefined,
    orderBy: { id: SortOrder },
    where: Prisma.BlockWhereInput,
    skip: 1 | 0,
    limit: number,
    includeTransactions: boolean,
  ): Promise<Block[] | (Block & { transactions: Transaction[] })[]> {
    const blocks = await this.prisma.block.findMany({
      cursor,
      orderBy,
      where,
      skip,
      take: limit,
    });

    if (includeTransactions) {
      const blocksWithTransactions = [];
      for (const block of blocks) {
        const transactions =
          await this.blocksTransactionsService.findTransactionsByBlock(block);
        blocksWithTransactions.push({ ...block, transactions });
      }
      return blocksWithTransactions;
    }

    return blocks;
  }

  private async getListMetadata(
    data: Block[],
    where: Prisma.BlockWhereInput,
    orderBy: Prisma.Enumerable<Prisma.BlockOrderByWithRelationInput>,
  ): Promise<{ hasNext: boolean; hasPrevious: boolean }> {
    const { length } = data;
    if (length === 0) {
      return {
        hasNext: false,
        hasPrevious: false,
      };
    }
    const nextRecords = await this.prisma.block.findMany({
      where,
      orderBy,
      cursor: { id: data[length - 1].id },
      skip: 1,
      take: 1,
    });
    const previousRecords = await this.prisma.block.findMany({
      where,
      orderBy,
      cursor: { id: data[0].id },
      skip: 1,
      take: -1,
    });
    return {
      hasNext: nextRecords.length > 0,
      hasPrevious: previousRecords.length > 0,
    };
  }

  async find(
    options: FindBlockOptions,
  ): Promise<Block | (Block & { transactions: Transaction[] }) | null> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const { withTransactions } = options;

    if (options.hash !== undefined) {
      const block = await this.prisma.block.findFirst({
        where: {
          hash: options.hash,
          network_version: networkVersion,
        },
      });

      if (block !== null && withTransactions) {
        const transactions =
          await this.blocksTransactionsService.findTransactionsByBlock(block);
        return { ...block, transactions };
      }

      return block;
    } else if (options.sequence !== undefined) {
      const block = await this.prisma.block.findFirst({
        where: {
          sequence: options.sequence,
          network_version: networkVersion,
        },
      });

      if (block !== null && withTransactions) {
        const transactions =
          await this.blocksTransactionsService.findTransactionsByBlock(block);
        return { ...block, transactions };
      }

      return block;
    } else {
      throw new UnprocessableEntityException();
    }
  }

  async disconnectAfter(sequenceGt: number): Promise<void> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    await this.prisma.$transaction([
      this.prisma.block.updateMany({
        data: {
          main: false,
        },
        where: {
          sequence: {
            gt: sequenceGt,
          },
          network_version: networkVersion,
        },
      }),
    ]);
  }
}
