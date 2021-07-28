/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { UsersModule } from '../users/users.module';
import { EventsController } from './events.controller';
import { EventsModule } from './events.module';

@Module({
  controllers: [EventsController],
  imports: [AccountsModule, EventsModule, UsersModule],
})
export class EventsRestModule {}
