/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Deposit, DepositHead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  async find(id: number): Promise<Deposit | null> {
    return this.prisma.deposit.findUnique({
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
