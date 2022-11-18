/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { MaspTransactionHead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaspTransactionHeadService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(blockHash: string): Promise<MaspTransactionHead> {
    return this.prisma.maspTransactionHead.upsert({
      create: {
        id: 1,
        block_hash: blockHash,
      },
      update: {
        block_hash: blockHash,
      },
      where: { id: 1 },
    });
  }

  async head(): Promise<MaspTransactionHead | null> {
    return this.prisma.maspTransactionHead.findFirst({
      where: { id: 1 },
    });
  }
}
