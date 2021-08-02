/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlocksDto } from './dto/create-blocks.dto';
import { BlockOperation } from './enums/block-operation';
import { Block } from '.prisma/client';

@Injectable()
export class BlocksService {
  constructor(
    private readonly config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async bulkUpsert({ blocks }: CreateBlocksDto): Promise<Block[]> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
    return this.prisma.$transaction(
      blocks.map(
        ({
          difficulty,
          graffiti,
          hash,
          previous_block_hash,
          sequence,
          timestamp,
          transactions_count,
          type,
        }) => {
          const main = type === BlockOperation.CONNECTED;
          return this.prisma.block.upsert({
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
        },
      ),
    );
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
}
