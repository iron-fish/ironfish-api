/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiConfigService } from '../api-config/api-config.service';

const DEFAULT_CONNECTION_LIMIT = 10;
const DEFAULT_POOL_TIMEOUT = 10;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(readonly config: ApiConfigService) {
    super({
      datasources: {
        db: {
          url: `${config.get<string>(
            'DATABASE_URL',
          )}?connection_limit=${config.getWithDefault(
            'CONNECTION_LIMIT',
            DEFAULT_CONNECTION_LIMIT,
          )}&pool_timeout=20${config.getWithDefault(
            'POOL_TIMEOUT',
            DEFAULT_POOL_TIMEOUT,
          )}`,
        },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
