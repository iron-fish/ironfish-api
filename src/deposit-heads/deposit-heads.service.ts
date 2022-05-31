/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { DepositHead } from '.prisma/client';

@Injectable()
export class DepositHeadsService {
  async upsert(
    blockHash: string,
    client: BasePrismaClient,
  ): Promise<DepositHead> {
    return client.depositHead.upsert({
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
