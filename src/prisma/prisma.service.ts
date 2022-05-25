/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, PrismaPromise } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly readClient: PrismaClient;

  constructor(readonly config: ApiConfigService) {
    super({
      datasources: {
        db: {
          url: config.dbPoolUrl,
        },
      },
    });
    this.readClient = new PrismaClient({
      datasources: { db: { url: config.readDbPoolUrl } },
    });
  }

  $queryRawUnsafe<T = unknown>(
    query: string,
    ...values: unknown[]
  ): PrismaPromise<T> {
    if (this.config.isProduction()) {
      return this.readClient.$queryRawUnsafe<T>(query, ...values);
    }
    return super.$queryRawUnsafe<T>(query, ...values);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.readClient.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.readClient.$disconnect();
  }
}
