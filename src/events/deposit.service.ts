/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Deposit } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepositService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async head(): Promise<Deposit | null> {
    const networkVersion = this.config.get<number>('NETWORK_VERSION');

    return await this.prisma.deposit.findFirst({
      where: {
        main: true,
        network_version: networkVersion,
      },
      orderBy: {
        block_sequence: SortOrder.DESC,
      },
    });
  }
}
