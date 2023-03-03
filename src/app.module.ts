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
import { DepositsJobsModule } from './events/deposits.jobs.module';
import { EventsJobsModule } from './events/events.jobs.module';
import { EventsRestModule } from './events/events.rest.module';
import { FaucetTransactionsRestModule } from './faucet-transactions/faucet-transactions.rest.module';
import { HealthRestModule } from './health/health.rest.module';
import { KycRestModule } from './jumio-kyc/kyc.rest.module';
import { LoggerModule } from './logger/logger.module';
import { MetricsRestModule } from './metrics/metrics.rest.module';
import { NodeUptimesJobsModule } from './node-uptimes/node-uptimes.jobs.module';
import { TelemetryRestModule } from './telemetry/telemetry.rest.module';
import { TransactionsRestModule } from './transactions/transactions.rest.module';
import { UserPointsJobsModule } from './user-points/user-points.jobs.module';
import { UserPointsRestModule } from './user-points/user-points.rest.module';
import { UsersRestModule } from './users/users.rest.module';
import { VersionsRestModule } from './versions/versions.rest.module';

export const JOBS_MODULES = [
  AssetsLoaderJobsModule,
  BlocksDailyJobsModule,
  DepositsJobsModule,
  EventsJobsModule,
  NodeUptimesJobsModule,
  UserPointsJobsModule,
];

export const REST_MODULES = [
  AssetDescriptionsRestModule,
  AssetsRestModule,
  AuthRestModule,
  BlocksDailyRestModule,
  BlocksRestModule,
  EventsRestModule,
  FaucetTransactionsRestModule,
  HealthRestModule,
  MetricsRestModule,
  KycRestModule,
  TelemetryRestModule,
  TransactionsRestModule,
  UserPointsRestModule,
  UsersRestModule,
  VersionsRestModule,
];

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: joi.object({
        ALLOW_BLOCK_MINED_POINTS: joi.boolean().default(false),
        ALLOW_NODE_UPTIME_POINTS: joi.boolean().default(false),
        API_URL: joi.string().required(),
        BLOCK_EXPLORER_URL: joi.string().required(),
        BLOCK_LOADER_TRANSACTION_TIMEOUT: joi.number().optional(),
        CHECK_EVENT_OCCURRED_AT: joi.boolean().default(true),
        CHECK_USER_CREATED_AT: joi.boolean().default(true),
        DATABASE_CONNECTION_POOL_URL: joi.string().required(),
        DATABASE_URL: joi.string().required(),
        DATADOG_URL: joi.string().required(),
        DISABLE_FAUCET: joi.boolean().default(false),
        DISABLE_LOGIN: joi.boolean().default(false),
        DYNO: joi.string().allow('').default(''),
        ENABLE_PHASE_3_END_CHECK: joi.boolean().default(true),
        ENABLE_SIGNUP: joi.boolean().default(true),
        GRAPHILE_CONCURRENCY: joi.number().required(),
        INCENTIVIZED_TESTNET_URL: joi.string().required(),
        INFLUXDB_API_TOKEN: joi.string().required(),
        INFLUXDB_BUCKET: joi.string().required(),
        INFLUXDB_ORG: joi.string().required(),
        INFLUXDB_URL: joi.string().required(),
        IRONFISH_API_KEY: joi.string().required(),
        IRONFISH_PHASE_ONE_API_URL: joi.string().required(),
        IRONFISH_PHASE_TWO_API_URL: joi.string().required(),
        JUMIO_API_CALLBACK_SECRET: joi.string().required(),
        JUMIO_API_SECRET: joi.string().required(),
        JUMIO_API_TOKEN: joi.string().required(),
        JUMIO_URL: joi.string().required(),
        JUMIO_WORKFLOW_DEFINITION: joi.number().required(),
        KYC_MAX_ATTEMPTS: joi.number().required(),
        MAGIC_SECRET_KEY: joi.string().required(),
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
