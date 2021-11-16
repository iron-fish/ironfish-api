/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Module } from '@nestjs/common';
import { BlocksDailyLoaderModule } from '../blocks-daily-loader/blocks-daily-loader.module';
import { GraphileWorkerModule } from '../graphile-worker/graphile-worker.module';
import { BlocksDailyJobsController } from './blocks-daily.jobs.controller';

@Module({
  controllers: [BlocksDailyJobsController],
  imports: [BlocksDailyLoaderModule, GraphileWorkerModule],
})
export class BlocksDailyJobsModule {}
