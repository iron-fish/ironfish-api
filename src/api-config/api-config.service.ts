/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
  constructor(private readonly config: ConfigService) {}

  get<T = unknown>(name: string): T {
    const value = this.config.get<T>(name);
    if (value === undefined) {
      throw new Error(`Missing config value for ${name}`);
    }
    return value;
  }

  getWithDefault<T = unknown>(name: string, defaultValue: T): T {
    const value = this.config.get<T>(name);
    if (value === undefined) {
      return defaultValue;
    }
    return value;
  }

  isLocal(): boolean {
    return this.get<string>('NODE_ENV') === 'development';
  }

  isStaging(): boolean {
    return this.get<string>('NODE_ENV') === 'staging';
  }

  isProduction(): boolean {
    return this.get<string>('NODE_ENV') === 'production';
  }

  get dbPoolUrl(): string {
    return `${this.get<string>('DATABASE_CONNECTION_POOL_URL')}?pgbouncer=true`;
  }
}
