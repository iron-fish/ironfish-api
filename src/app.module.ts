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
import { AuthModule } from './auth/auth.module';
import { AuthRestModule } from './auth/auth.rest.module';
import { BlocksRestModule } from './blocks/blocks.rest.module';
import { ContextMiddleware } from './common/middlewares/context.middleware';
import { RequireSslMiddleware } from './common/middlewares/require-ssl.middleware';
import { EventsRestModule } from './events/events.rest.module';
import { HealthRestModule } from './health/health.rest.module';
import { MetricsRestModule } from './metrics/metrics.rest.module';
import { TransactionsRestModule } from './transactions/transactions.rest.module';
import { UsersRestModule } from './users/users.rest.module';

export const REST_MODULES = [
  AuthRestModule,
  BlocksRestModule,
  EventsRestModule,
  HealthRestModule,
  MetricsRestModule,
  TransactionsRestModule,
  UsersRestModule,
];

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: joi.object({
        BLOCK_EXPLORER_URL: joi.string().required(),
        DATABASE_URL: joi.string().required(),
        INCENTIVIZED_TESTNET_URL: joi.string().required(),
        IRONFISH_API_KEY: joi.string().required(),
        MAGIC_SECRET_KEY: joi.string().required(),
        NETWORK_VERSION: joi.number().required(),
        NODE_ENV: joi.string().required(),
      }),
    }),
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
