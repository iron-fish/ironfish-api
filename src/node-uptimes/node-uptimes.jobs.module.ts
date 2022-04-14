/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { LoggerModule } from '../logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { NodeUptimesJobsController } from './node-uptimes.jobs.controller';
import { NodeUptimesModule } from './node-uptimes.module';

@Module({
  controllers: [NodeUptimesJobsController],
  imports: [
    EventsModule,
    LoggerModule,
    NodeUptimesModule,
    PrismaModule,
    UsersModule,
  ],
})
export class NodeUptimesJobsModule {}
