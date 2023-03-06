/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { Job, makeWorkerUtils, WorkerUtils } from 'graphile-worker';
import { Pool, PoolConfig } from 'pg';
import { v4 as uuid } from 'uuid';
import { ApiConfigService } from '../api-config/api-config.service';
import { GraphileWorkerPattern } from './enums/graphile-worker-pattern';
import { GraphileWorkerJobOptions } from './interfaces/graphile-worker-job-options';

@Injectable()
export class GraphileWorkerService {
  private workerUtils!: WorkerUtils;
  private workerUtilsPromise: Promise<WorkerUtils> | null = null;

  constructor(private readonly config: ApiConfigService) {}

  async addJob<T = unknown>(
    pattern: GraphileWorkerPattern,
    payload?: T,
    { queueName, runAt, jobKey, jobKeyMode }: GraphileWorkerJobOptions = {},
  ): Promise<Job> {
    await this.initWorkerUtils();

    return this.workerUtils.addJob(pattern.toString(), payload, {
      jobKey: jobKey || `job_${uuid()}`,
      jobKeyMode,
      queueName,
      runAt,
    });
  }

  async queuedJobCount(): Promise<number> {
    await this.initWorkerUtils();

    return this.workerUtils.withPgClient(async (pgClient) => {
      const result = await pgClient.query<{ count: bigint }>(
        'SELECT COUNT(*) FROM graphile_worker.jobs WHERE locked_at IS NULL;',
      );

      return Number(result.rows[0].count);
    });
  }

  private async initWorkerUtils(): Promise<void> {
    if (this.workerUtils) {
      return;
    }

    if (this.workerUtilsPromise) {
      await this.workerUtilsPromise;
      return;
    }

    this.workerUtilsPromise = makeWorkerUtils({
      pgPool: new Pool(this.getPostgresPoolConfig()),
    });

    this.workerUtils = await this.workerUtilsPromise;
  }

  private getPostgresPoolConfig(): PoolConfig {
    return {
      connectionString: this.config.get<string>('DATABASE_URL'),
      ssl:
        this.config.get<string>('NODE_ENV') !== 'development'
          ? { rejectUnauthorized: false }
          : undefined,
    };
  }
}
