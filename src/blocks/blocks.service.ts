/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Block } from '.prisma/client';

@Injectable()
export class BlocksService {
  constructor(
    private readonly config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async upsert(
    hash: string,
    sequence: number,
    difficulty: string,
    main: boolean,
    timestamp: Date,
    transactionsCount: number,
    graffiti: string,
    previousBlockHash?: string,
  ): Promise<Block> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
    const [block] = await this.prisma.$transaction([
      this.prisma.block.upsert({
        create: {
          hash,
          sequence,
          difficulty,
          main,
          timestamp,
          graffiti,
          transactions_count: transactionsCount,
          network_version: networkVersion,
          previous_block_hash: previousBlockHash,
        },
        update: {
          sequence,
          difficulty,
          main,
          timestamp,
          graffiti,
          transactions_count: transactionsCount,
          previous_block_hash: previousBlockHash,
        },
        where: {
          uq_blocks_on_hash_and_network_version: {
            hash,
            network_version: networkVersion,
          },
        },
      }),
    ]);
    return block;
  }
}
