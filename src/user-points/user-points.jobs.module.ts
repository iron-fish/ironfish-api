/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { GraphileWorkerModule } from '../graphile-worker/graphile-worker.module';
import { LoggerModule } from '../logger/logger.module';
import { UsersModule } from '../users/users.module';
import { UserPointsJobsController } from './user-points.jobs.controller';
import { UserPointsModule } from './user-points.module';

@Module({
  controllers: [UserPointsJobsController],
  imports: [
    EventsModule,
    GraphileWorkerModule,
    LoggerModule,
    UsersModule,
    UserPointsModule,
  ],
})
export class UserPointsJobsModule {}
