/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  async findOrThrowByGraffiti(graffiti: string): Promise<User> {
    const record = await this.prisma.user.findUnique({
      where: {
        graffiti,
      },
    });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
  }

  async create(email: string, graffiti: string): Promise<User> {
    const existingRecord = await this.prisma.user.findUnique({
      where: {
        graffiti,
      },
    });
    if (existingRecord) {
      throw new UnprocessableEntityException(
        `User already exists for '${graffiti}'`,
      );
    }
    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          email,
          graffiti,
        },
      }),
    ]);
    return user;
  }
}
