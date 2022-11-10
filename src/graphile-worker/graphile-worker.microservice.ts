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
  private concurrently = 0;
  private lastJobEndedAt = new Date().getTime();

  constructor(
    private readonly config: ApiConfigService,
    private readonly datadogService: DatadogService,
    private readonly loggerService: LoggerService,
  ) {
    super();
  }

  async listen(): Promise<void> {
    this.runner = await run({
      concurrency: this.config.get<number>('GRAPHILE_CONCURRENCY'),
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
    const handlers: Record<string, Task> = {};
    let whitelist = new Set(patterns);

    const configDyno = this.config.get<string>('DYNO');

    if (configDyno) {
      // DYNO should be something like worker.1 and converted to WORKER_1_GRAPHILE_PATTERNS
      const configWorker =
        configDyno.replace('.', '_').toUpperCase() + '_GRAPHILE_PATTERNS';

      const configPatterns = this.config.getWithDefault<string>(
        configWorker,
        '',
      );

      this.loggerService.info(
        `Configuring worker whitelist as ${configWorker}: ${configPatterns}`,
      );

      if (configPatterns) {
        whitelist = new Set(configPatterns.split(',').map((s) => s.trim()));
      }
    }

    for (const pattern of patterns) {
      if (whitelist.has(pattern)) {
        handlers[pattern] = this.createMessageHandler(
          pattern as unknown as GraphileWorkerPattern,
        );
      }
    }

    return handlers;
  }

  private createMessageHandler(pattern: GraphileWorkerPattern): Task {
    return async (payload: unknown) => {
      const start = new Date().getTime();

      this.concurrently += 1;
      const idle = start - this.lastJobEndedAt;

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
        const end = new Date().getTime();
        const duration = end - start;

        this.concurrently -= 1;
        this.lastJobEndedAt = end;

        this.datadogService.timing('worker', duration, {
          pattern,
        });

        this.loggerService.info(
          JSON.stringify({
            duration,
            pattern,
            running: this.concurrently,
            idle: (idle / 1000).toFixed(2) + ' seconds',
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
