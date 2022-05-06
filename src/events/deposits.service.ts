/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Deposit, DepositHead } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class DepositsService {
  constructor(
    private readonly config: ApiConfigService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async find(id: number): Promise<Deposit | null> {
    return await this.prisma.deposit.findUnique({
      where: {
        id,
      },
    });
  }

  async findOrThrow(id: number): Promise<Deposit> {
    const deposit = await this.find(id);

    if (!deposit) {
      throw new NotFoundException();
    }

    return deposit;
  }

  async head(): Promise<DepositHead | null> {
    return this.prisma.depositHead.findFirst({
      where: { id: 1 },
    });
  }
}
