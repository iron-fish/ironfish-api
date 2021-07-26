/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { SortOrder } from '../common/enums/sort-order';
import { PrismaService } from '../prisma/prisma.service';
import { ListAccountsOptions } from './interfaces/list-accounts-options';
import { Account } from '.prisma/client';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findOrThrow(id: number): Promise<Account> {
    const record = await this.prisma.account.findUnique({
      where: { id },
    });
    if (record === null) {
      throw new NotFoundException();
    }
    return record;
  }

  async findOrThrowByPublicAddress(publicAddress: string): Promise<Account> {
    const record = await this.prisma.account.findUnique({
      where: {
        public_address: publicAddress,
      },
    });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async list(options: ListAccountsOptions): Promise<Account[]> {
    const backwards = options.before !== undefined;
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const limit = Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const order = backwards ? SortOrder.ASC : SortOrder.DESC;
    const skip = cursor ? 1 : 0;
    const orderBy = options.orderBy
      ? [{ [options.orderBy]: order }, { id: order }]
      : { id: order };
    return this.prisma.account.findMany({
      cursor,
      orderBy,
      skip,
      take: limit,
    });
  }

  async create(publicAddress: string): Promise<Account> {
    const existingRecord = await this.prisma.account.findUnique({
      where: {
        public_address: publicAddress,
      },
    });
    if (existingRecord) {
      throw new UnprocessableEntityException(
        `Account already exists for '${publicAddress}'`,
      );
    }
    const [account] = await this.prisma.$transaction([
      this.prisma.account.create({
        data: {
          public_address: publicAddress,
        },
      }),
    ]);
    return account;
  }
}
