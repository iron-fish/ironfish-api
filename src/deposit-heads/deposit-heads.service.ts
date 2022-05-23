/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepositHead } from '.prisma/client';

@Injectable()
export class DepositHeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(blockHash: string): Promise<DepositHead> {
    return this.prisma.depositHead.upsert({
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
}
