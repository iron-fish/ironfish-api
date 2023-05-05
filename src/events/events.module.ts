/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api-config.module';
import { BlocksModule } from '../blocks/blocks.module';
import { GraphileWorkerModule } from '../graphile-worker/graphile-worker.module';
import { InfluxDbModule } from '../influxdb/influxdb.module';
import { LoggerModule } from '../logger/logger.module';
import { MultiAssetHeadModule } from '../multi-asset-head/multi-asset-head.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserPointsModule } from '../user-points/user-points.module';
import { UsersModule } from '../users/users.module';
import { EventsService } from './events.service';
import { MultiAssetService } from './multi-asset.service';
import { MultiAssetUpsertService } from './multi-asset.upsert.service';

@Module({
  exports: [EventsService, MultiAssetService, MultiAssetUpsertService],
  imports: [
    ApiConfigModule,
    BlocksModule,
    MultiAssetHeadModule,
    GraphileWorkerModule,
    InfluxDbModule,
    LoggerModule,
    PrismaModule,
    UserPointsModule,
    UsersModule,
  ],
  providers: [EventsService, MultiAssetUpsertService, MultiAssetService],
})
export class EventsModule {}
