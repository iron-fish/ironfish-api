/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiConfigModule } from '../api-config/api-config.module';
import { DatadogInterceptor } from './datadog.interceptor';
import { DatadogService } from './datadog.service';

@Module({
  exports: [DatadogService],
  imports: [ApiConfigModule],
  providers: [
    DatadogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: DatadogInterceptor,
    },
  ],
})
export class DatadogModule {}
