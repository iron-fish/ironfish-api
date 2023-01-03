/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { MultiAssetHead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MultiAssetHeadService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(blockHash: string): Promise<MultiAssetHead> {
    return this.prisma.multiAssetHead.upsert({
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

  async head(): Promise<MultiAssetHead | null> {
    return this.prisma.multiAssetHead.findFirst({
      where: { id: 1 },
    });
  }
}
