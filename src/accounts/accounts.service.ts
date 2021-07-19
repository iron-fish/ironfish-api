/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../common/constants';
import { PaginationOptions } from '../common/interfaces/pagination-options';
import { PrismaService } from '../prisma/prisma.service';
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

  async list(options: PaginationOptions): Promise<Account[]> {
    const backwards = options.before !== undefined;
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const limit = Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const order = backwards ? 'desc' : 'asc';
    const skip = cursor ? 1 : 0;
    return this.prisma.account.findMany({
      cursor,
      orderBy: {
        id: order,
      },
      skip,
      take: limit,
    });
  }
}
