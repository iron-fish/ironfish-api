/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { InfluxDbModule } from '../influxdb/influxdb.module';
import { NodeUptimesModule } from '../node-uptimes/node-uptimes.module';
import { UsersModule } from '../users/users.module';
import { TelemetryController } from './telemetry.controller';

@Module({
  controllers: [TelemetryController],
  imports: [InfluxDbModule, NodeUptimesModule, UsersModule],
})
export class TelemetryRestModule {}
