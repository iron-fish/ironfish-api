/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { run, Runner, Task, TaskList } from 'graphile-worker';
import { Pool, PoolConfig } from 'pg';
import { ApiConfigService } from '../api-config/api-config.service';
import { DatadogService } from '../datadog/datadog.service';
import { LoggerService } from '../logger/logger.service';
import { GraphileWorkerPattern } from './enums/graphile-worker-pattern';
import { GraphileWorkerHandler } from './types/graphile-worker-handler';

export class GraphileWorkerMicroservice
  extends Server
  implements CustomTransportStrategy
{
  private runner!: Runner;

  constructor(
    private readonly config: ApiConfigService,
    private readonly datadogService: DatadogService,
    private readonly loggerService: LoggerService,
  ) {
    super();
  }

  async listen(): Promise<void> {
    this.runner = await run({
      noHandleSignals: false,
      pgPool: new Pool(this.getPostgresPoolConfig()),
      taskList: this.getTaskHandlers(),
    });
  }

  async close(): Promise<void> {
    await this.runner.stop();
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

  private getTaskHandlers(): TaskList {
    const patterns = Array.from(this.messageHandlers.keys());
    const taskList: Record<string, Task> = {};
    for (const pattern of patterns) {
      taskList[pattern] = this.createMessageHandler(
        pattern as unknown as GraphileWorkerPattern,
      );
    }
    return taskList;
  }

  private createMessageHandler(pattern: GraphileWorkerPattern): Task {
    return async (payload: unknown) => {
      const start = new Date().getTime();
      try {
        await this.handle(pattern, payload);

        this.datadogService.increment('worker.success', 1, {
          pattern,
        });
      } catch (error) {
        if (error instanceof Error) {
          this.datadogService.increment('worker.error', 1, {
            pattern,
            type: error.constructor.name,
          });
        }

        throw error;
      } finally {
        const duration = new Date().getTime() - start;

        this.datadogService.timing('worker', duration, {
          pattern,
        });

        this.loggerService.info(
          JSON.stringify({
            duration,
            pattern,
          }),
        );
      }
    };
  }

  private async handle(
    pattern: GraphileWorkerPattern,
    payload: unknown,
  ): Promise<void> {
    const handler = this.messageHandlers.get(
      pattern.toString(),
    ) as GraphileWorkerHandler;
    if (!handler) {
      throw new Error(`Undefined pattern: '${pattern}'`);
    }

    const response = await handler(payload as Record<string, unknown>);
    if (response && response.requeue) {
      throw new Error('Retry Graphile Worker message');
    }
  }
}
