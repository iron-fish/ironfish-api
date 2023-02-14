/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { EventsModule } from '../events/events.module';
import { NodeUptimesModule } from '../node-uptimes/node-uptimes.module';
import { RecaptchaVerificationModule } from '../recaptcha-verification/recaptcha-verification.module';
import { UserPointsModule } from '../user-points/user-points.module';
import { UserRanksModule } from '../user-rank/user-ranks.module';
import { MeController } from './me.controller';
import { UsersController } from './users.controller';
import { UsersModule } from './users.module';
import { UsersUpdaterModule } from './users-updater.module';

@Module({
  controllers: [MeController, UsersController],
  imports: [
    ApiConfigModule,
    EventsModule,
    NodeUptimesModule,
    UserPointsModule,
    UserRanksModule,
    UsersModule,
    UsersUpdaterModule,
    RecaptchaVerificationModule,
  ],
})
export class UsersRestModule {}
