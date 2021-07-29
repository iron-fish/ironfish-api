/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { BlocksModule } from './blocks/blocks.module';
import { EventsModule } from './events/events.module';
import { EventsRestModule } from './events/events-rest.module';
import { GraphileWorkerModule } from './graphile-worker/graphile-worker.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,
    BlocksModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: joi.object({
        DATABASE_URL: joi.string().required(),
        IRONFISH_API_KEY: joi.string().required(),
      }),
    }),
    EventsModule,
    EventsRestModule,
    GraphileWorkerModule,
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
