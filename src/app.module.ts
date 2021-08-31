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
import { AuthModule } from './auth/auth.module';
import { AuthRestModule } from './auth/auth.rest.module';
import { BlocksModule } from './blocks/blocks.module';
import { BlocksRestModule } from './blocks/blocks.rest.module';
import { TransactionsModule } from './transactions/transactions.module';
import { TransactionsRestModule } from './transactions/transactions.rest.module';
import { ContextMiddleware } from './common/middlewares/context.middleware';
import { RequireSslMiddleware } from './common/middlewares/require-ssl.middleware';
import { EventsModule } from './events/events.module';
import { EventsRestModule } from './events/events.rest.module';
import { HealthModule } from './health/health.module';
import { MetricsRestModule } from './metrics/metrics.rest.module';
import { UsersModule } from './users/users.module';
import { UsersRestModule } from './users/users.rest.module';

@Module({
  imports: [
    AuthModule,
    AuthRestModule,
    BlocksModule,
    BlocksRestModule,
    TransactionsModule,
    TransactionsRestModule,
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
    EventsModule,
    EventsRestModule,
    HealthModule,
    MetricsRestModule,
    UsersModule,
    UsersRestModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequireSslMiddleware, ContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
