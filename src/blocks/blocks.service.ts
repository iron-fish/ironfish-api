/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SortOrder } from '../common/enums/sort-order';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { BlockDto, UpsertBlocksDto } from './dto/upsert-blocks.dto';
import { BlockOperation } from './enums/block-operation';
import { FindBlockOptions } from './interfaces/find-block-options';
import { Block } from '.prisma/client';

@Injectable()
export class BlocksService {
  constructor(
    private readonly config: ConfigService,
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
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
  }: BlockDto): Promise<Block> {
    const main = type === BlockOperation.CONNECTED;
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
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
        },
        update: {
          sequence,
          difficulty,
          main,
          timestamp,
          graffiti,
          transactions_count,
          previous_block_hash,
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
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
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

  async list(sequenceGte: number, sequenceLt: number): Promise<Block[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
    return this.prisma.block.findMany({
      where: {
        sequence: {
          gte: sequenceGte,
          lt: sequenceLt,
        },
        main: true,
        network_version: networkVersion,
      },
    });
  }

  async find(options: FindBlockOptions): Promise<Block | null> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
    const hash = options.hash ?? undefined;
    const seq_index = options.sequence ?? undefined;

    // This feels un-elegant, but it's clear.
    if (hash !== undefined) {
      return this.prisma.block.findFirst({
        where: {
          hash: hash,
          network_version: networkVersion,
        },
      });
    } else {
      return this.prisma.block.findFirst({
        where: {
          sequence: seq_index,
          network_version: networkVersion,
        },
      });
    }
  }

  async disconnectAfter(sequenceGt: number): Promise<void> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
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
