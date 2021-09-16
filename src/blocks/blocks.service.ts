/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiConfigService } from '../api-config/api-config.service';
import { BlocksTransactionsService } from '../blocks-transactions/blocks-transactions.service';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { BlockDto, UpsertBlocksDto } from './dto/upsert-blocks.dto';
import { BlockOperation } from './enums/block-operation';
import { FindBlockOptions } from './interfaces/find-block-options';
import { ListBlocksOptions } from './interfaces/list-block-options';
import { Block, Prisma, Transaction } from '.prisma/client';

@Injectable()
export class BlocksService {
  constructor(
    private readonly blocksTransactionsService: BlocksTransactionsService,
    private readonly config: ApiConfigService,
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
    private readonly usersService: UsersService,
  ) {}

  async bulkUpsert({ blocks }: UpsertBlocksDto): Promise<Block[]> {
    const records = [];
    for (const block of blocks) {
      records.push(await this.upsert(block));
    }
    return records;
  }

  private async upsert({
    difficulty,
    graffiti,
    hash,
    previous_block_hash,
    sequence,
    timestamp,
    transactions_count,
    type,
    size,
  }: BlockDto): Promise<Block> {
    const main = type === BlockOperation.CONNECTED;
    const networkVersion = this.config.get<number>('NETWORK_VERSION');
    const searchable_text = hash + ' ' + String(sequence);

    return this.prisma.$transaction(async (prisma) => {
      const block = await prisma.block.upsert({
        create: {
          hash,
          sequence,
          difficulty,
          main,
          timestamp,
          graffiti,
          transactions_count,
          network_version: networkVersion,
          previous_block_hash,
          searchable_text,
          size,
        },
        update: {
          sequence,
          difficulty,
          main,
          timestamp,
          graffiti,
          transactions_count,
          previous_block_hash,
          size,
        },
        where: {
          uq_blocks_on_hash_and_network_version: {
            hash,
            network_version: networkVersion,
          },
        },
      });

      const user = await this.usersService.findByGraffiti(graffiti, prisma);
      if (user && timestamp > user.created_at) {
        if (main) {
          await this.eventsService.upsertBlockMined(block, user, prisma);
        } else {
          await this.eventsService.deleteBlockMined(block, user, prisma);
        }
      }

      return block;
    });
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
    const { withTransactions } = options;
    if (options.sequenceGte !== undefined && options.sequenceLt !== undefined) {
      const where = {
        sequence: {
          gte: options.sequenceGte,
          lt: options.sequenceLt,
        },
        main: true,
        network_version: networkVersion,
      };
      return {
        data: await this.getBlocksData(
          cursor,
          orderBy,
          where,
          skip,
          limit,
          networkVersion,
          withTransactions,
        ),
        hasNext: false,
        hasPrevious: false,
      };
    } else if (options.search !== undefined) {
      const where = {
        searchable_text: {
          contains: options.search,
        },
        main: true,
        network_version: networkVersion,
      };
      const data = await this.getBlocksData(
        cursor,
        orderBy,
        where,
        skip,
        limit,
        networkVersion,
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
        networkVersion,
        withTransactions,
      );
      return {
        data,
        ...(await this.getListMetadata(data, where, orderBy)),
      };
    } else {
      const where = {
        main: true,
        network_version: networkVersion,
      };
      const data = await this.getBlocksData(
        cursor,
        orderBy,
        where,
        skip,
        limit,
        networkVersion,
        withTransactions,
      );
      return {
        data,
        ...(await this.getListMetadata(data, where, orderBy)),
      };
    }
  }

  private async getBlocksData(
    cursor: { id: number } | undefined,
    orderBy: { id: SortOrder },
    where: Record<string, unknown>,
    skip: 1 | 0,
    limit: number,
    networkVersion: number,
    includeTransactions: boolean | undefined,
  ): Promise<Block[] | (Block & { transactions: Transaction[] })[]> {
    const blocks = await this.prisma.block.findMany({
      cursor,
      orderBy,
      where,
      skip,
      take: limit,
    });

    if (includeTransactions) {
      return Promise.all(
        blocks.map(async (block) => {
          const blocksTransactions = await this.blocksTransactionsService.list({
            blockId: block.id,
          });
          const transactionIds = blocksTransactions.map(
            (blockTransaction) => blockTransaction.transaction_id,
          );
          const transactions = await this.transactionsService.findByIds(
            transactionIds,
            networkVersion,
          );
          return { ...block, transactions };
        }),
      );
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
    const include = { transactions: options.withTransactions };

    if (options.hash !== undefined) {
      return this.prisma.block.findFirst({
        where: {
          hash: options.hash,
          network_version: networkVersion,
        },
        include,
      });
    } else if (options.sequence !== undefined) {
      return this.prisma.block.findFirst({
        where: {
          sequence: options.sequence,
          network_version: networkVersion,
        },
        include,
      });
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
