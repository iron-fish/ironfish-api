/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import joi from 'joi';
import { ApiConfigModule } from './api-config/api-config.module';
import { AssetDescriptionsRestModule } from './asset-descriptions/asset-descriptions.rest.module';
import { AssetsRestModule } from './assets/assets.rest.module';
import { AssetsLoaderJobsModule } from './assets-loader/assets-loader.jobs.module';
import { AuthModule } from './auth/auth.module';
import { AuthRestModule } from './auth/auth.rest.module';
import { BlocksRestModule } from './blocks/blocks.rest.module';
import { BlocksDailyJobsModule } from './blocks-daily/blocks-daily.jobs.module';
import { BlocksDailyRestModule } from './blocks-daily/blocks-daily.rest.module';
import { ContextMiddleware } from './common/middlewares/context.middleware';
import { RequireSslMiddleware } from './common/middlewares/require-ssl.middleware';
import { DatadogModule } from './datadog/datadog.module';
import { FaucetTransactionsRestModule } from './faucet-transactions/faucet-transactions.rest.module';
import { HealthRestModule } from './health/health.rest.module';
import { LoggerModule } from './logger/logger.module';
import { TelemetryRestModule } from './telemetry/telemetry.rest.module';
import { TransactionsRestModule } from './transactions/transactions.rest.module';
import { VersionsRestModule } from './versions/versions.rest.module';

export const JOBS_MODULES = [AssetsLoaderJobsModule, BlocksDailyJobsModule];

export const REST_MODULES = [
  AssetDescriptionsRestModule,
  AssetsRestModule,
  AuthRestModule,
  BlocksDailyRestModule,
  BlocksRestModule,
  FaucetTransactionsRestModule,
  HealthRestModule,
  TelemetryRestModule,
  TransactionsRestModule,
  VersionsRestModule,
];

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: joi.object({
        API_URL: joi.string().required(),
        BLOCK_EXPLORER_URL: joi.string().required(),
        BLOCK_LOADER_TRANSACTION_TIMEOUT: joi.number().optional(),
        DATABASE_CONNECTION_POOL_URL: joi.string().required(),
        DATABASE_URL: joi.string().required(),
        DATADOG_URL: joi.string().required(),
        DISABLE_FAUCET: joi.boolean().default(false),
        DYNO: joi.string().allow('').default(''),
        GRAPHILE_CONCURRENCY: joi.number().required(),
        INFLUXDB_API_TOKEN: joi.string().required(),
        INFLUXDB_BUCKET: joi.string().required(),
        INFLUXDB_ORG: joi.string().required(),
        INFLUXDB_URL: joi.string().required(),
        IRONFISH_API_KEY: joi.string().required(),
        NETWORK_VERSION: joi.number().required(),
        NODE_ENV: joi.string().required(),
        PORT: joi.number().default(8003),
      }),
    }),
    DatadogModule,
    LoggerModule,
    ...JOBS_MODULES,
    ...REST_MODULES,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequireSslMiddleware, ContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
