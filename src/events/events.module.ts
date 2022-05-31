/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { BlocksModule } from '../blocks/blocks.module';
import { DepositHeadsModule } from '../deposit-heads/deposit-heads.module';
import { GraphileWorkerModule } from '../graphile-worker/graphile-worker.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserPointsModule } from '../user-points/user-points.module';
import { UsersModule } from '../users/users.module';
import { DepositsService } from './deposits.service';
import { DepositsUpsertService } from './deposits.upsert.service';
import { EventsService } from './events.service';

@Module({
  exports: [EventsService, DepositsService, DepositsUpsertService],
  imports: [
    ApiConfigModule,
    BlocksModule,
    DepositHeadsModule,
    GraphileWorkerModule,
    PrismaModule,
    UserPointsModule,
    UsersModule,
  ],
  providers: [EventsService, DepositsService, DepositsUpsertService],
})
export class EventsModule {}
