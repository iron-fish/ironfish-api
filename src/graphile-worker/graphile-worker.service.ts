/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Job, makeWorkerUtils, WorkerUtils } from 'graphile-worker';
import { Pool, PoolConfig } from 'pg';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { GraphileWorkerPattern } from './enums/graphile-worker-pattern';

@Injectable()
export class GraphileWorkerService {
  private workerUtils!: WorkerUtils;

  constructor(private readonly config: ApiConfigService) {}

  async addJob<T>(
    pattern: GraphileWorkerPattern,
    payload: T,
    runAt?: Date,
    queueName?: string,
  ): Promise<Job> {
    if (!this.workerUtils) {
      await this.initWorkerUtils();
    }
    return this.workerUtils.addJob(pattern.toString(), payload, {
      jobKey: `job_${uuid()}`,
      queueName,
      runAt,
    });
  }

  private async initWorkerUtils(): Promise<void> {
    this.workerUtils = await makeWorkerUtils({
      pgPool: new Pool(this.getPostgresPoolConfig()),
    });
  }

  private getPostgresPoolConfig(): PoolConfig {
    return {
      connectionString: this.config.get<string>('DATABASE_URL'),
      ssl:
        this.config.get<string>('NODE_ENV') !== 'development'
          ? { rejectUnauthorized: true }
          : undefined,
    };
  }
}
