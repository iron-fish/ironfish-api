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

  async create(
    hash: string,
    sequence: number,
    difficulty: number,
    main: boolean,
    timestamp: Date,
    transactionsCount: number,
    previousBlockHash?: string,
  ): Promise<Block> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION', 0);
    const [block] = await this.prisma.$transaction([
      this.prisma.block.create({
        data: {
          hash,
          sequence,
          difficulty,
          main,
          timestamp,
          transactions_count: transactionsCount,
          network_version: networkVersion,
          previous_block_hash: previousBlockHash,
        },
      }),
    ]);
    return block;
  }
}
