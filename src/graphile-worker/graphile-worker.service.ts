/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { makeWorkerUtils, WorkerUtils } from 'graphile-worker';

@Injectable()
export class GraphileWorkerService implements OnModuleInit, OnModuleDestroy {
  private workerUtils!: WorkerUtils;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.workerUtils = await makeWorkerUtils({
      connectionString: this.config.get('DATABASE_URL'),
    });
    await this.workerUtils.migrate();
  }

  async onModuleDestroy(): Promise<void> {
    await this.workerUtils.release();
  }
}
