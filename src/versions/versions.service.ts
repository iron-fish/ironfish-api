/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BasePrismaClient } from '../prisma/types/base-prisma-client';
import { Version } from '.prisma/client';

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(version: string): Promise<Version> {
    return this.prisma.$transaction(async (prisma) => {
      return prisma.version.create({
        data: {
          version,
        },
      });
    });
  }

  async getLatest(): Promise<Version | null> {
    return this.prisma.version.findFirst({
      orderBy: {
        version: 'desc',
      },
    });
  }

  async getLatestAtDate(
    date: Date,
    prisma?: BasePrismaClient,
  ): Promise<Version | null> {
    const client = prisma ?? this.prisma;
    return client.version.findFirst({
      orderBy: {
        version: 'desc',
      },
      where: {
        created_at: {
          lte: date,
        },
      },
    });
  }
}
