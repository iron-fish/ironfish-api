/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { makeWorkerUtils, WorkerUtils } from 'graphile-worker';

@Injectable()
export class GraphileWorkerService implements OnModuleInit, OnModuleDestroy {
  private workerUtils!: WorkerUtils;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.config.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new InternalServerErrorException(
        'Database URL value not configured',
      );
    }
    this.workerUtils = await makeWorkerUtils({
      connectionString: `${databaseUrl}?ssl=true`,
    });
    await this.workerUtils.migrate();
  }

  async onModuleDestroy(): Promise<void> {
    await this.workerUtils.release();
  }
}
