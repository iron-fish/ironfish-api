/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { UsersModule } from '../users/users.module';
import { NodeUptimesJobsController } from './node-uptimes.jobs.controller';
import { NodeUptimesLoaderModule } from './node-uptimes-loader.module';

@Module({
  controllers: [NodeUptimesJobsController],
  imports: [LoggerModule, NodeUptimesLoaderModule, UsersModule],
})
export class NodeUptimesJobsModule {}
