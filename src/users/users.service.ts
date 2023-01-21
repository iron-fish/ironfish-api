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
import { standardizeEmail } from '../common/utils/email';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { UserPointsService } from '../user-points/user-points.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersOptions } from './interfaces/list-users-options';
import { UpdateUserOptions } from './interfaces/update-user-options';
import { Prisma, User } from '.prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPointsService: UserPointsService,
  ) {}

  async find(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findOrThrow(id: number): Promise<User> {
    const record = await this.find(id);
    if (record === null) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByGraffiti(
    graffiti: string,
    prisma?: BasePrismaClient,
  ): Promise<User | null> {
    const client = prisma ?? this.prisma;
    return client.user.findFirst({
      where: {
        graffiti,
      },
    });
  }

  async findManyAndMapByGraffiti(
    graffiti: string[],
  ): Promise<Map<string, User>> {
    const unique = Array.from(new Set(graffiti));

    const users = await this.prisma.user.findMany({
      where: {
        graffiti: {
          in: unique,
        },
      },
    });

    const results = new Map<string, User>();
    for (const user of users) {
      results.set(user.graffiti, user);
    }

    return results;
  }

  async findByGraffitiOrThrow(graffiti: string): Promise<User> {
    const record = await this.findByGraffiti(graffiti);
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByEmailOrThrow(email: string): Promise<User> {
    const record = await this.findByEmail(email);
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async findByEmail(email: string): Promise<User | null> {
    email = standardizeEmail(email);
    return this.prisma.user.findFirst({
      where: {
        email,
      },
    });
  }

  async listByEmail(email: string): Promise<User[]> {
    email = standardizeEmail(email);
    return this.prisma.user.findMany({
      where: {
        email,
      },
    });
  }

  async create({
    email,
    graffiti,
    country_code: countryCode,
    discord,
    telegram,
    github,
  }: CreateUserDto): Promise<User> {
    email = standardizeEmail(email);
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

    return this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email,
          graffiti,
          discord,
          telegram,
          github,
          country_code: countryCode,
        },
      });

      await this.userPointsService.upsertWithClient(
        { userId: user.id },
        prisma,
      );

      return user;
    });
  }

  async list(options: ListUsersOptions): Promise<{
    data: User[];
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const cursorId = options.before ?? options.after;
    const cursor = cursorId ? { id: cursorId } : undefined;
    const direction = options.before !== undefined ? -1 : 1;
    const limit =
      direction * Math.min(MAX_LIMIT, options.limit || DEFAULT_LIMIT);
    const orderBy = { id: SortOrder.DESC };
    const skip = cursor ? 1 : 0;
    const where = {
      country_code: options.countryCode,
      graffiti: {
        contains: options.search,
      },
    };
    const data = await this.prisma.user.findMany({
      cursor,
      orderBy,
      skip,
      take: limit,
      where,
    });

    return {
      data,
      ...(await this.getListMetadata(data, where, orderBy)),
    };
  }

  private async getListMetadata(
    data: User[],
    where: Prisma.UserWhereInput,
    orderBy: Prisma.Enumerable<Prisma.UserOrderByWithRelationInput>,
  ): Promise<{ hasNext: boolean; hasPrevious: boolean }> {
    const { length } = data;
    if (length === 0) {
      return {
        hasNext: false,
        hasPrevious: false,
      };
    }
    const nextRecords = await this.prisma.user.findMany({
      where,
      orderBy,
      cursor: { id: data[length - 1].id },
      skip: 1,
      take: 1,
    });
    const previousRecords = await this.prisma.user.findMany({
      where,
      orderBy,
      cursor: { id: data[0].id },
      skip: 1,
      take: -1,
    });
    return {
      hasNext: nextRecords.length > 0,
      hasPrevious: previousRecords.length > 0,
    };
  }

  async updateLastLoginAt(user: User): Promise<User> {
    return this.prisma.$transaction(async (prisma) => {
      return prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          last_login_at: new Date().toISOString(),
        },
      });
    });
  }

  async findDuplicateUser(
    user: User,
    options: UpdateUserOptions,
    client: BasePrismaClient,
  ): Promise<User[]> {
    const { discord, github, graffiti, telegram } = options;

    const filters = [];
    if (discord) {
      filters.push({ discord });
    }
    if (github) {
      filters.push({ github });
    }
    if (graffiti) {
      filters.push({ graffiti });
    }
    if (telegram) {
      filters.push({ telegram });
    }

    return client.user.findMany({
      where: {
        OR: filters,
        NOT: {
          id: user.id,
        },
      },
    });
  }

  async update(
    user: User,
    options: UpdateUserOptions,
    client: BasePrismaClient,
  ): Promise<User> {
    const { countryCode, discord, github, graffiti, telegram } = options;
    return client.user.update({
      data: {
        country_code: countryCode,
        discord,
        github,
        graffiti,
        telegram,
      },
      where: {
        id: user.id,
      },
    });
  }
}
