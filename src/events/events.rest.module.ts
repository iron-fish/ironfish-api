/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { GraphileWorkerModule } from '../graphile-worker/graphile-worker.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { EventsController } from './events.controller';
import { EventsModule } from './events.module';

@Module({
  controllers: [EventsController],
  imports: [
    EventsModule,
    UsersModule,
    ApiConfigModule,
    GraphileWorkerModule,
    PrismaModule,
  ],
})
export class EventsRestModule {}
