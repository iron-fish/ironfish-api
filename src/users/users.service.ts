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
import { ListUsersOptions } from './interfaces/list-users-options';
import { User } from '.prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOrThrow(id: number): Promise<User> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });
    if (record === null) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByGraffiti(graffiti: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        graffiti,
        last_login_at: {
          not: null,
        },
      },
    });
  }

  async findOrThrowByGraffiti(graffiti: string): Promise<User> {
    const record = await this.findByGraffiti(graffiti);
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async create(
    email: string,
    graffiti: string,
    countryCode: string,
  ): Promise<User> {
    const existingRecord = await this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email,
          },
          {
            graffiti,
          },
        ],
      },
    });
    if (existingRecord) {
      throw new UnprocessableEntityException(
        `User already exists for '${
          graffiti === existingRecord.graffiti ? graffiti : email
        }'`,
      );
    }
    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          email,
          graffiti,
          country_code: countryCode,
        },
      }),
    ]);
    return user;
  }

  async list(options: ListUsersOptions): Promise<User[]> {
    const backwards = options.before !== undefined;
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const limit = Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const order = backwards ? SortOrder.ASC : SortOrder.DESC;
    const skip = cursor ? 1 : 0;
    const orderBy = options.orderBy
      ? [{ [options.orderBy]: order }, { id: order }]
      : { id: order };
    return this.prisma.user.findMany({
      cursor,
      orderBy,
      skip,
      take: limit,
      where: {
        graffiti: {
          contains: options.search,
        },
      },
    });
  }
}
