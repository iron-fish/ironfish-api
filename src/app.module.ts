/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import joi from 'joi';
import { AccountsModule } from './accounts/accounts.module';
import { AccountsRestModule } from './accounts/accounts-rest.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { EventsRestModule } from './events/events-rest.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AccountsModule,
    AccountsRestModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: joi.object({
        DATABASE_URL: joi.string().required(),
        IRONFISH_API_KEY: joi.string().required(),
      }),
    }),
    EventsModule,
    EventsRestModule,
    HealthModule,
  ],
})
export class AppModule {}
