/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventOptions, StatsD, Tags } from 'hot-shots';
import { ApiConfigService } from '../api-config/api-config.service';

const DEFAULT_PORT = 8125;

@Injectable()
export class DatadogService implements OnModuleDestroy {
  private datadogClient: StatsD;

  constructor(private readonly config: ApiConfigService) {
    this.datadogClient = new StatsD({
      bufferFlushInterval: 1000,
      globalTags: {
        env: this.config.get<string>('NODE_ENV'),
      },
      host: this.config.get<string>('DATADOG_URL'),
      port: DEFAULT_PORT,
      prefix: 'api.',
    });
  }

  timing(stat: string, value: number, tags?: Tags): void {
    this.datadogClient.timing(stat, value, tags);
  }

  increment(stat: string, value: number, tags?: Tags): void {
    this.datadogClient.increment(stat, value, tags);
  }

  event(
    title: string,
    text?: string,
    options?: EventOptions,
    tags?: Tags,
  ): void {
    this.datadogClient.event(title, text, options, tags);
  }

  onModuleDestroy(): void {
    this.datadogClient.close();
  }
}
