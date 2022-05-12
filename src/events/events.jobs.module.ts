/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { LoggerModule } from '../logger/logger.module';
import { UsersModule } from '../users/users.module';
import { EventsJobsController } from './events.jobs.controller';
import { EventsModule } from './events.module';

@Module({
  controllers: [EventsJobsController],
  imports: [BlocksModule, EventsModule, LoggerModule, UsersModule],
})
export class EventsJobsModule {}
