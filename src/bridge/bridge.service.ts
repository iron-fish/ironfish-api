/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { EthBridgeAddresses } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BridgeService {
  constructor(private readonly prisma: PrismaService) {}

  async findByIds(ids: number[]): Promise<EthBridgeAddresses[]> {
    return this.prisma.ethBridgeAddresses.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async getOrCreateIds(addresses: string[]): Promise<EthBridgeAddresses[]> {
    const results = [];

    for (const address of addresses) {
      const result = await this.prisma.ethBridgeAddresses.upsert({
        where: { address },
        update: {},
        create: { address },
      });
      results.push(result);
    }

    return results;
  }
}
