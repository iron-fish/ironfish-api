/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DecisionLabel,
  DecisionStatus,
  Redemption,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RedemptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrThrow(user: User): Promise<Redemption> {
    const redemption = await this.find(user);
    if (!redemption) {
      throw new NotFoundException('Redemption for user not found');
    }
    return redemption;
  }

  async find(user: User): Promise<Redemption | null> {
    return await this.prisma.redemption.findFirst({
      where: { user: { id: user.id } },
    });
  }

  async update(
    redemption: Redemption,
    data: { decision_status: DecisionStatus; jumio_account_id?: string },
  ): Promise<Redemption> {
    return this.prisma.redemption.update({
      data,
      where: {
        id: redemption.id,
      },
    });
  }

  async create(user: User, public_address: string): Promise<Redemption> {
    return await this.prisma.redemption.create({
      data: {
        user: { connect: { id: user.id } },
        public_address,
        decision_status: DecisionStatus.NOT_EXECUTED,
        decision_label: DecisionLabel.NOT_UPLOADED,
      },
    });
  }
}
